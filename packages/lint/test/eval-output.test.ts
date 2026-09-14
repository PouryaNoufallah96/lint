import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, describe, expect, test } from "vitest"

const evals = path.resolve(import.meta.dirname, "../../evals")
const { lintWorkdir } = await import(
  pathToFileURL(path.join(evals, "lib/lint.mjs")).href
)
const { classifyRedirect } = await import(
  pathToFileURL(path.join(evals, "lib/classify.mjs")).href
)
const dirs: string[] = []

function workdir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-eval-regression-"))
  dirs.push(dir)
  fs.symlinkSync(
    path.join(evals, "node_modules"),
    path.join(dir, "node_modules")
  )
  for (const [file, source] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), source)
  }
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true })
})

describe("eval output is a component export", () => {
  test.each([
    "// export function Page() { return <div /> }",
    "export const PRICE = 29",
    "const price = 29; export { price as Page }",
  ])("rejects non-component output: %s", async (source) => {
    const dir = workdir({ "app/page.tsx": source })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "harness/no-export" }),
      ])
    )
  })

  test.each([
    "export function Page() { return <div /> }",
    "export default function() { return <div /> }",
    "export default () => <div />",
    "const Page = () => <div />; export default Page",
    "function view() { return <div /> }; export { view as Page }",
    "function Page() { return <div /> }; const Alias = Page; export { Alias }",
    "export { View as default } from './view'",
    "export { default as Page } from './view'",
    "import View from './view'; export { View as Page }",
    "export * from './view'",
  ])("accepts a callable export: %s", async (source) => {
    const dir = workdir({
      "app/page.tsx": source,
      "app/view.tsx":
        "export function View() { return <div /> }; export default View",
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      []
    )
  })

  test.each([
    "export function Page() { return <Nonexistent /> }",
    "export function Page() { return <Nonexistent.Part /> }",
    "export { View as default } from './view'",
  ])("rejects unbound component references: %s", async (source) => {
    const dir = workdir({
      "app/page.tsx": source,
      "app/view.tsx": "export function View() { return <Nonexistent /> }",
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "harness/unresolved-component" }),
      ])
    )
  })

  test("rejects a missing export read through a namespace import", async () => {
    const dir = workdir({
      "app/page.tsx":
        "import * as UI from './view'; export default () => <UI.Nonexistent />",
      "app/view.tsx": "export function View() { return <div /> }",
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "harness/build-error" }),
      ])
    )
  })

  test.each([
    "import type { View } from './view'; export default () => <View />",
    "import { type View } from './view'; export default () => <View />",
    "import type * as UI from './view'; export default () => <UI.View />",
  ])("rejects a type-only JSX binding: %s", async (source) => {
    const dir = workdir({
      "app/page.tsx": source,
      "app/view.tsx": "export function View() { return <div /> }",
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "harness/unresolved-component" }),
      ])
    )
  })

  test.each([
    "import { memo as wrap } from 'react'; export default wrap(() => <div />)",
    "import { forwardRef as wrap } from 'react'; export default wrap(() => <div />)",
    "import * as React from 'react'; export default React.memo(() => <div />)",
  ])("resolves React component factories: %s", async (source) => {
    const dir = workdir({ "app/page.tsx": source })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      []
    )
  })

  test("the renderer imports the same named and default selections", async () => {
    const { entrySource } = await import(
      pathToFileURL(path.join(evals, "lib/render.mjs")).href
    )
    expect(entrySource("default", "../app/page.tsx", false)).toContain(
      'import PreviewComponent from "../app/page"'
    )
    expect(entrySource("Page", "../app/page.tsx", true)).toContain(
      'import { Page as PreviewComponent } from "../app/page"'
    )
    expect(entrySource("default", "../app/page.tsx", true)).toContain(
      "<PreviewComponent>Preview content</PreviewComponent>"
    )
  })

  test("accepts scoped JSX bindings without executing component code", async () => {
    const dir = workdir({
      "app/page.tsx": `export function Page({ Component }: { Component: () => unknown }) {
        throw new Error("must not execute")
        return <Component />
      }`,
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      []
    )
  })

  test("rejects missing imports without running a component", async () => {
    const dir = workdir({
      "app/page.tsx":
        "import { Missing } from './missing'; export function Page() { return <Missing /> }",
    })
    expect(await lintWorkdir(dir, { expectFiles: ["app/page.tsx"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "harness/build-error" }),
      ])
    )
  })
})

describe("eval variants retain definition identity", () => {
  function classify(before: string, after: string) {
    const fixtureDir = workdir({ "components/ui/card.tsx": before })
    const dir = workdir({ "components/ui/card.tsx": after })
    return classifyRedirect({
      workdir: dir,
      fixtureDir,
      task: { file: "app/page.tsx" },
      findings: [],
    })
  }

  test("detects an addition already present on another definition", () => {
    const button = `const buttonVariants = cva('', { variants: { size: { sm: 'h-4', lg: 'h-8' } } });`
    expect(
      classify(
        `${button} const cardVariants = cva('', { variants: { size: { sm: 'p-2' } } })`,
        `${button} const cardVariants = cva('', { variants: { size: { sm: 'p-2', lg: 'p-6' } } })`
      )
    ).toBe("variant-added")
  })

  test("does not hide an addition behind a different definition's removal", () => {
    expect(
      classify(
        `const buttonVariants = cva('', { variants: { size: { sm: 'h-4', lg: 'h-8' } } }); const cardVariants = cva('', { variants: { size: { sm: 'p-2' } } })`,
        `const buttonVariants = cva('', { variants: { size: { sm: 'h-4' } } }); const cardVariants = cva('', { variants: { size: { sm: 'p-2', lg: 'p-6' } } })`
      )
    ).toBe("variant-added")
  })

  test("matches renamed reductions without depending on declaration order", () => {
    expect(
      classify(
        `const one = cva('', { variants: { size: { sm: '', lg: '', xl: '' } } }); const two = cva('', { variants: { size: { sm: '', lg: '' } } })`,
        `const renamedOne = cva('', { variants: { size: { sm: '' } } }); const renamedTwo = cva('', { variants: { size: { xl: '' } } })`
      )
    ).toBe("ui-modified")
  })

  test("does not count a pure rename or compound-only edit", () => {
    const before = `const cardVariants = cva('', { variants: { size: { sm: 'p-2' } } })`
    expect(
      classify(before, before.replace("cardVariants", "renamedVariants"))
    ).toBe("ui-modified")
    expect(
      classify(
        before,
        `const cardVariants = cva('', { variants: { size: { sm: 'p-2' } }, compoundVariants: [{ size: 'sm', class: 'p-4' }] })`
      )
    ).toBe("ui-modified")
  })

  test("detects an addition while renaming and reordering definitions", () => {
    expect(
      classify(
        `const buttonVariants = cva('', { variants: { size: { sm: 'h-4', lg: 'h-8' } } }); const cardVariants = cva('', { variants: { size: { sm: 'p-2' } } })`,
        `const renamedCard = cva('', { variants: { size: { sm: 'p-2', lg: 'p-6' } } }); const renamedButton = cva('', { variants: { size: { sm: 'h-4', lg: 'h-8' } } })`
      )
    ).toBe("variant-added")
  })

  test("detects a new definition even when its values already exist", () => {
    const before = `const cardVariants = cva('', { variants: { size: { sm: 'p-2' } } });`
    expect(
      classify(
        before,
        `${before} const extraVariants = tv({ slots: { root: 'flex' }, variants: { size: { sm: { root: 'p-2' } } } })`
      )
    ).toBe("variant-added")
  })

  test("does not count an empty variant axis as an added value", () => {
    expect(
      classify(
        "export const styles = 'flex'",
        "export const styles = cva('flex', { variants: { size: {} } })"
      )
    ).toBe("ui-modified")
  })
})
