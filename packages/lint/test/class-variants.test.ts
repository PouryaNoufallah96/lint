import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, test } from "vitest"

import { groupOf } from "../src/grammar/classifier"
import { plugin } from "../src/index"

const APPEARANCE_CASES = [
  ["font-(family-name:--code-font)", "font-family", "typography"],
  ["md:font-(family-name:--code-font)!", "font-family", "typography"],
  ["hover:!font-(family-name:--code-font)", "font-family", "typography"],
  [
    "supports-[display:grid]:font-(family-name:--code-font)",
    "font-family",
    "typography",
  ],
  ["font-[family-name:var(--code-font)]", "font-family", "typography"],
  ["font-(--weight)", "font-weight", "typography"],
  ["text-(color:--ink)", "text-color", "color"],
  ["hover:text-(color:--ink)", "text-color", "color"],
  ["[&:nth-child(2)]:text-(color:--ink)", "text-color", "color"],
  ["[&:nth-child(2)]:text-[color:var(--ink)]", "text-color", "color"],
  ["[&[data-label='(']]:text-primary", "text-color", "color"],
  ["text-(--ink)", "text-color", "color"],
] as const

const linter = new Linter()

function lint(token: string) {
  return linter.verify(
    `import { Input } from "@acme/ui"\nexport const A = <Input className={${JSON.stringify(token)}} />`,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn: plugin },
        rules: {
          "shadcn/no-restyle": [
            "error",
            {
              componentImports: ["^@acme/ui$"],
              // The contract is Input's whole policy, so layout is opened
              // here rather than at the top level.
              contracts: [
                { pattern: "^Input$", allow: ["layout", "font-mono"] },
              ],
            },
          ],
        },
      },
    ],
    { filename: "class-variants.tsx" }
  )
}

describe("class variants", () => {
  test.each(APPEARANCE_CASES)("%s belongs to %s", (token, group) => {
    expect(groupOf(token)).toBe(group)
  })

  test.each(APPEARANCE_CASES)(
    "%s cannot cross the component boundary",
    (token, _group, category) => {
      const messages = lint(token)
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        ruleId: "shadcn/no-restyle",
        messageId: "appearanceClass",
        message: expect.stringContaining(
          `"${token}" is not allowed on <Input>: <Input> owns its ${category}`
        ),
      })
    }
  )

  test.each([
    "font-mono",
    "md:font-mono!",
    "w-(--control-width)",
    "[&:nth-child(2)]:w-(--control-width)",
  ])("%s remains allowed", (token) => {
    expect(lint(token)).toEqual([])
  })
})
