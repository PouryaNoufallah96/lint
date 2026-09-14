// Variants written as a prop typed with a union of string literals, the
// same shape as a cva axis without the factory: read for the messages'
// "use an existing variant" list and for the size list.

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, test } from "vitest"

import {
  extractVariantDefinitions,
  sizeNamesFor,
  variantNamesFor,
} from "../src/project/variants"

describe("variants from props", () => {
  test("an inline props type on a function component", () => {
    const source = `
      function Text({ children, className, variant = "default" }: {
        children: React.ReactNode
        className?: string
        variant?: "default" | "h1" | "h2" | "h3"
      }) {
        return <p className={\`text-2xl \${className}\`}>{children}</p>
      }
      export { Text }
    `
    expect(extractVariantDefinitions(source)).toEqual([
      {
        name: "Text",
        axes: { variant: ["default", "h1", "h2", "h3"] },
        source: "props",
      },
    ])
  })

  test("an intersection with React.ComponentProps, on an arrow component", () => {
    const source = `
      export const Card = ({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) => (
        <div data-size={size} className={cn("rounded-xl", className)} {...props} />
      )
    `
    expect(extractVariantDefinitions(source)).toEqual([
      { name: "Card", axes: { size: ["default", "sm"] }, source: "props" },
    ])
  })

  test("a props type alias or interface referenced by name", () => {
    const source = `
      type BadgeProps = { tone?: "neutral" | "info"; variant?: "solid" | "outline" }
      interface ChipProps extends Base { size?: "sm" | "lg"; label: string }
      export function Badge(props: BadgeProps) { return <span /> }
      export function Chip(props: ChipProps) { return <span /> }
    `
    expect(extractVariantDefinitions(source)).toEqual([
      {
        name: "Badge",
        axes: { tone: ["neutral", "info"], variant: ["solid", "outline"] },
        source: "props",
      },
      { name: "Chip", axes: { size: ["sm", "lg"] }, source: "props" },
    ])
  })

  test("non-literal unions and plain strings are not axes", () => {
    const source = `
      export function Field({ label, kind, width }: { label: string; kind?: Kind | "auto"; width?: number | "full" }) {
        return <div />
      }
    `
    expect(extractVariantDefinitions(source)).toEqual([])
  })

  test("a cva named after the component still wins over its props", () => {
    const source = `
      const buttonVariants = cva("", { variants: { variant: { default: "", ghost: "" } } })
      export function Button({ variant }: { variant?: "default" | "ghost" | "unlisted" }) { return <button /> }
    `
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shadcn-lint-variants-"))
    const file = path.join(dir, "button.tsx")
    fs.writeFileSync(file, source)
    expect(variantNamesFor(file, "Button")).toEqual(["default", "ghost"])
  })

  test("another component's props in the same file are not borrowed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shadcn-lint-variants-"))
    const file = path.join(dir, "card.tsx")
    fs.writeFileSync(
      file,
      `export function Card({ size }: { size?: "default" | "sm" }) { return <div /> }
       export function CardTitle(props: { className?: string }) { return <div /> }`
    )
    expect(sizeNamesFor(file, "Card")).toEqual(["default", "sm"])
    expect(sizeNamesFor(file, "CardTitle")).toBeNull()
  })

  test("variantNamesFor and sizeNamesFor read the component's props", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shadcn-lint-variants-"))
    const file = path.join(dir, "text.tsx")
    fs.writeFileSync(
      file,
      `export function Text({ variant, size }: { variant?: "default" | "h1"; size?: "sm" | "lg" }) { return <p /> }`
    )
    expect(variantNamesFor(file, "Text")).toEqual(["default", "h1"])
    expect(sizeNamesFor(file, "Text")).toEqual(["sm", "lg"])
  })
})
