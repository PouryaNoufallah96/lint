import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { plugin } from "../src/index"
import * as components from "../src/project/components"
import * as theme from "../src/project/theme"
import * as variants from "../src/project/variants"
import { button, PAGE, PROJECT } from "./helpers"

vi.mock("../src/project/variants", async (importOriginal) => {
  const actual = await importOriginal<typeof variants>()
  return { ...actual, variantNamesFor: vi.fn(actual.variantNamesFor) }
})

vi.mock("../src/project/theme", async (importOriginal) => {
  const actual = await importOriginal<typeof theme>()
  return {
    ...actual,
    colorTokensFor: vi.fn(actual.colorTokensFor),
    colorValuesFor: vi.fn(actual.colorValuesFor),
    spacingBaseFor: vi.fn(actual.spacingBaseFor),
  }
})

vi.mock("../src/project/components", async (importOriginal) => {
  const actual = await importOriginal<typeof components>()
  return { ...actual, componentsFor: vi.fn(actual.componentsFor) }
})

function lint(code: string, rules: Record<string, unknown>) {
  return new Linter({ cwd: PROJECT }).verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: { parser },
        plugins: { shadcn: plugin },
        rules,
      },
    ] as any,
    { filename: PAGE }
  )
}

beforeEach(() => vi.clearAllMocks())

describe("diagnostic work stays off the clean path", () => {
  test("accepted component classes do not read variants", () => {
    expect(
      lint(`${button}; const A = <Button className="w-full mt-4" />`, {
        "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      })
    ).toEqual([])
    expect(variants.variantNamesFor).not.toHaveBeenCalled()
  })

  test("the first violation loads variants once, including custom messages", () => {
    const messages = lint(
      `${button}; const A = <Button className="w-full bg-red-500 rounded-full" />`,
      {
        "shadcn/no-restyle": [
          "error",
          { allow: ["layout"], message: "{{className}}: {{variants}}" },
        ],
      }
    )
    expect(messages).toHaveLength(2)
    expect(messages[0].message).toContain(
      "bg-red-500: default, outline, secondary, ghost, destructive, link"
    )
    expect(messages[1].message).toContain(
      "rounded-full: default, outline, secondary, ghost, destructive, link"
    )
    expect(variants.variantNamesFor).toHaveBeenCalledTimes(1)
  })

  test("allowed arbitrary values do not read the spacing unit", () => {
    expect(
      lint('const A = <div className="w-[13px] p-4" />', {
        "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
      })
    ).toEqual([])
    expect(theme.spacingBaseFor).not.toHaveBeenCalled()
  })

  test("spacing suggestions share the unit and preserve exact fixes", () => {
    const messages = lint('const A = <div className="p-[12px] m-[16px]" />', {
      "shadcn/no-arbitrary-values": "error",
    })
    expect(
      messages.map((message) => message.suggestions?.[0].fix.text)
    ).toEqual(['"p-3 m-[16px]"', '"p-[12px] m-4"'])
    expect(theme.spacingBaseFor).toHaveBeenCalledTimes(1)
  })

  test("declared colors do not resolve suggestion values", () => {
    expect(
      lint('const A = <div className="bg-primary w-full text-foreground" />', {
        "shadcn/no-raw-colors": "error",
      })
    ).toEqual([])
    expect(theme.colorValuesFor).not.toHaveBeenCalled()
  })

  test("files without class sites skip component discovery and color reads", () => {
    expect(
      lint('const A = <svg fill="currentColor" />', {
        "shadcn/no-restyle": "error",
        "shadcn/no-raw-colors": "error",
      })
    ).toEqual([])
    expect(components.componentsFor).not.toHaveBeenCalled()
    expect(theme.colorTokensFor).not.toHaveBeenCalled()
    expect(theme.colorValuesFor).not.toHaveBeenCalled()
  })

  test("SVG color diagnostics still resolve suggestions without a class site", () => {
    const messages = lint('const A = <svg fill="#ffffff" />', {
      "shadcn/no-raw-colors": "error",
    })
    expect(messages).toHaveLength(1)
    expect(messages[0].messageId).toBe("rawColorAttributeNear")
    expect(theme.colorValuesFor).toHaveBeenCalledTimes(1)
    expect(components.componentsFor).not.toHaveBeenCalled()
  })

  test("a later rule can scan strings after a rule skips the shared tracker", () => {
    const messages = lint('const tone = "bg-red-500"', {
      "shadcn/no-restyle": "error",
      "shadcn/no-raw-colors": ["error", { scanAllStrings: true }],
    })
    expect(messages).toHaveLength(1)
    expect(messages[0].ruleId).toBe("shadcn/no-raw-colors")
    expect(components.componentsFor).toHaveBeenCalledTimes(1)
  })

  test("invalid policy still reports on a file without class sites", () => {
    const contracts = [{ pattern: "[" }]
    const messages = lint("export const value = 1", {
      "shadcn/no-restyle": ["error", { contracts }],
      "shadcn/no-arbitrary-values": ["error", { contracts }],
      "shadcn/no-raw-colors": ["error", { contracts }],
    })
    expect(messages).toHaveLength(3)
    for (const message of messages) {
      expect(message.message).toContain("is not a valid regular expression")
    }
  })
})
