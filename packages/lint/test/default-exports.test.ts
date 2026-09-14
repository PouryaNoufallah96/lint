// A ui component exported as `export default memo(Button)` is a Button:
// by import, and by name in the component index.

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, expect, test } from "vitest"

import { componentsFor } from "../src/project/components"
import { resetFsMemo } from "../src/project/fs"

let root: string

function write(name: string, source: string) {
  const file = path.join(root, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, source)
  return file
}

beforeEach(() => {
  resetFsMemo()
  root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "lint-default-exports-"))
  )
  write("package.json", JSON.stringify({ private: true }))
  write(
    "components.json",
    JSON.stringify({ aliases: { ui: "@/components/ui" } })
  )
  write(
    "tsconfig.json",
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
  )
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

test("a memo-wrapped default export is indexed under its own name", () => {
  const button = write(
    "components/ui/button.tsx",
    'import { memo } from "react"\nfunction Button() { return null }\nexport default memo(Button)'
  )
  const index = componentsFor(path.join(root, "app/page.tsx"))
  expect(index.has("Button")).toBe(true)
  expect(index.files.get("Button")).toBe(button)
  expect(index.has("default")).toBe(false)
})
