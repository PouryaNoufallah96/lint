import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, test } from "vitest"

import { plugin } from "../src/index"
import { button, cn, PAGE, PROJECT } from "./helpers"

const RULES = [
  "no-arbitrary-values",
  "no-raw-colors",
  "no-unknown-classes",
  "no-restyle",
  "require-static-classes",
]
const CLASSES = "bg-red-500 rounded-[13px] flex-cols"

function diagnostics(code: string, rules: Linter.RulesRecord) {
  return new Linter({ cwd: PROJECT })
    .verify(
      `${button}\n${cn}\n${code}`,
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn: plugin },
        rules,
      } as any,
      { filename: PAGE }
    )
    .map((message) => ({
      ruleId: message.ruleId,
      messageId: message.messageId,
      message: message.message,
      location: [
        message.line,
        message.column,
        message.endLine,
        message.endColumn,
      ],
      suggestions: (message.suggestions ?? []).map((suggestion) => ({
        messageId: suggestion.messageId,
        message: suggestion.desc,
        replacement: suggestion.fix,
      })),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

// Every rule takes the same collector options. no-restyle opens layout,
// which does not cover "flex-cols": an unclassified name is its finding
// as well as the unknown-classes rule's, so each restyle site adds one.
function rulesWith(options: Record<string, unknown> = {}) {
  return Object.fromEntries(
    RULES.map((rule) => [
      `shadcn/${rule}`,
      [
        "error",
        rule === "no-restyle" ? { ...options, allow: ["layout"] } : options,
      ],
    ])
  ) as Linter.RulesRecord
}

function expectIndependentRules(code: string, rules: Linter.RulesRecord) {
  const entries = Object.entries(rules)
  const independent = entries
    .flatMap(([rule, value]) => diagnostics(code, { [rule]: value }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  expect(diagnostics(code, rules)).toEqual(independent)
  expect(diagnostics(code, Object.fromEntries(entries.reverse()))).toEqual(
    independent
  )
  return independent
}

const lint = (code: string, rules: Record<string, unknown>) =>
  new Linter({ cwd: PROJECT }).verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn: plugin },
        rules,
      },
    ] as any,
    { filename: PAGE }
  )

describe("class-site diagnostic ownership", () => {
  test.each([
    ["standalone helper", `cn("${CLASSES}")`, 0],
    ["nested standalone helper", `cn(cn("${CLASSES}"))`, 0],
    [
      "nested attribute helper",
      `<Button className={cn(cn("${CLASSES}"))} />`,
      3,
    ],
    [
      "helper referenced by two components",
      `const classes = cn("${CLASSES}"); <><Button className={classes} /><Button className={classes} /></>`,
      6,
    ],
    [
      "nested helper reached through an object member",
      `const classes = { root: cn(cn("${CLASSES}")) }; <Button className={classes.root} />`,
      3,
    ],
  ])("%s preserves individual and combined output", (_name, code, restyles) => {
    const messages = expectIndependentRules(code as string, rulesWith())
    for (const rule of RULES.slice(0, 3)) {
      expect(
        messages.filter((message) => message.ruleId === `shadcn/${rule}`)
      ).toHaveLength(1)
    }
    expect(
      messages.filter((message) => message.ruleId === "shadcn/no-restyle")
    ).toHaveLength(restyles as number)
    expect(
      messages.filter(
        (message) => message.ruleId === "shadcn/require-static-classes"
      )
    ).toHaveLength(0)
  })

  test("keeps source locations, message text and suggestion replacements", () => {
    const code = `const classes = cn("${CLASSES}"); <><Button className={classes} /><Button className={classes} /></>`
    expect(diagnostics(code, rulesWith())).toMatchInlineSnapshot(`
      [
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""rounded-[13px]" hardcodes an off-token value. Nearest on the scale: rounded-xl (14px), rounded-lg (10px).",
          "messageId": "arbitraryValueNearScale",
          "ruleId": "shadcn/no-arbitrary-values",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""bg-red-500" uses the raw Tailwind palette. Nearest theme tokens: bg-destructive. Use one of those, or declare --color-<name> in app/globals.css for a new color.",
          "messageId": "paletteClassNear",
          "ruleId": "shadcn/no-raw-colors",
          "suggestions": [
            {
              "message": "Replace with "bg-destructive".",
              "messageId": "useToken",
              "replacement": {
                "range": [
                  100,
                  137,
                ],
                "text": ""bg-destructive rounded-[13px] flex-cols"",
              },
            },
          ],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""bg-red-500" is not allowed on <Button>: <Button> owns its color. Use a variant: default, outline, secondary, ghost, destructive, link. Add a new variant in components/ui/button.tsx only if the design explicitly calls for a treatment none of these provides.",
          "messageId": "appearanceClassWithVariants",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""bg-red-500" is not allowed on <Button>: <Button> owns its color. Use a variant: default, outline, secondary, ghost, destructive, link. Add a new variant in components/ui/button.tsx only if the design explicitly calls for a treatment none of these provides.",
          "messageId": "appearanceClassWithVariants",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""rounded-[13px]" is not allowed on <Button>: <Button> owns its shape. Use a variant: default, outline, secondary, ghost, destructive, link. Add a new variant in components/ui/button.tsx only if the design explicitly calls for a treatment none of these provides.",
          "messageId": "appearanceClassWithVariants",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""rounded-[13px]" is not allowed on <Button>: <Button> owns its shape. Use a variant: default, outline, secondary, ghost, destructive, link. Add a new variant in components/ui/button.tsx only if the design explicitly calls for a treatment none of these provides.",
          "messageId": "appearanceClassWithVariants",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""flex-cols" is not allowed on <Button>: the grammar does not recognize it. Fix the spelling, or use a class Tailwind generates.",
          "messageId": "unclassifiedClass",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""flex-cols" is not allowed on <Button>: the grammar does not recognize it. Fix the spelling, or use a class Tailwind generates.",
          "messageId": "unclassifiedClass",
          "ruleId": "shadcn/no-restyle",
          "suggestions": [],
        },
        {
          "location": [
            3,
            20,
            3,
            57,
          ],
          "message": ""flex-cols" is not a class this project's Tailwind knows, so no CSS is generated for it. Did you mean "flex-col"?",
          "messageId": "unknownClassSuggest",
          "ruleId": "shadcn/no-unknown-classes",
          "suggestions": [
            {
              "message": "Replace with "flex-col".",
              "messageId": "useSuggestion",
              "replacement": {
                "range": [
                  100,
                  137,
                ],
                "text": ""bg-red-500 rounded-[13px] flex-col"",
              },
            },
          ],
        },
      ]
    `)
  })

  test("scanAllStrings retains source ownership alongside contextual uses", () => {
    const code = `const unrelated = "bg-red-500 rounded-[13px]"; const classes = cn("bg-red-500 rounded-[13px]"); <Button className={classes} />`
    const messages = expectIndependentRules(code, {
      "shadcn/no-arbitrary-values": ["error", { scanAllStrings: true }],
      "shadcn/no-raw-colors": ["error", { scanAllStrings: true }],
      "shadcn/no-restyle": "error",
    })
    for (const rule of ["no-arbitrary-values", "no-raw-colors", "no-restyle"]) {
      expect(
        messages.filter((message) => message.ruleId === `shadcn/${rule}`)
      ).toHaveLength(2)
    }
  })

  test("scanAllStrings reports a bare hoisted literal once", () => {
    const code = `const classes = "p-[13px]"; <div className={classes} />`
    const messages = diagnostics(code, {
      "shadcn/no-arbitrary-values": ["error", { scanAllStrings: true }],
    })
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('"p-[13px]"')
  })

  test("collector options stay isolated between rules", () => {
    const code = `const classes = merge("${CLASSES}"); <Button className={classes} />`
    const messages = expectIndependentRules(code, {
      "shadcn/no-arbitrary-values": ["error", { mergeFunctions: ["merge"] }],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-unknown-classes": ["error", { mergeFunctions: ["merge"] }],
      "shadcn/no-restyle": [
        "error",
        { mergeFunctions: ["merge"], allow: ["layout"] },
      ],
      "shadcn/require-static-classes": "error",
    })
    // Two appearance findings and the unclassified name.
    expect(messages.map((message) => message.ruleId).sort()).toEqual([
      "shadcn/no-arbitrary-values",
      "shadcn/no-restyle",
      "shadcn/no-restyle",
      "shadcn/no-restyle",
      "shadcn/no-unknown-classes",
      "shadcn/require-static-classes",
    ])
  })

  test("custom variant functions retain their value interpretation", () => {
    const code = `const classes = variants({ base: "${CLASSES}", defaultVariants: { size: "unrelated-value" } }); <Button className={classes} />`
    const messages = expectIndependentRules(
      code,
      rulesWith({ variantFunctions: ["variants"] })
    )
    expect(messages.map((message) => message.ruleId).sort()).toEqual([
      "shadcn/no-arbitrary-values",
      "shadcn/no-raw-colors",
      "shadcn/no-restyle",
      "shadcn/no-restyle",
      "shadcn/no-restyle",
      "shadcn/no-unknown-classes",
    ])
  })

  test.each([
    "function View({ className }) { return <Button className={className} /> }",
    'function View({ className = "bg-red-500" }) { return <Button className={className} /> }',
    "function View({ className = build() }) { return <Button className={className} /> }",
    "function View(props = build()) { return <Button className={props.className} /> }",
    'function View({ className }) { className = "bg-red-500"; return <Button className={className} /> }',
    "function View({ className }) { return <Button className={`prefix-${className}`} /> }",
  ])("forwarded and unresolved values preserve combined output: %s", (code) => {
    expectIndependentRules(code, rulesWith())
  })
})

describe("a standalone helper call reaches every rule", () => {
  const cases = [
    `import { cva } from "class-variance-authority"\nconst styles = cva("bg-red-500 rounded-[13px]")\nexport const Demo = () => <div className={styles()} />`,
    `${cn}\nconst styles = cn("bg-red-500 rounded-[13px]")\nexport const Demo = () => <div className={styles} />`,
  ]
  const orders = [
    { "shadcn/no-raw-colors": "error", "shadcn/no-arbitrary-values": "error" },
    { "shadcn/no-arbitrary-values": "error", "shadcn/no-raw-colors": "error" },
  ]
  test("both rules report in both registration orders", () => {
    for (const code of cases) {
      for (const rules of orders) {
        const ids = lint(code, rules)
          .map((m) => m.ruleId)
          .sort()
        expect(ids).toEqual([
          "shadcn/no-arbitrary-values",
          "shadcn/no-raw-colors",
        ])
      }
    }
  })
  test("and through the documented rule set", () => {
    const rules = {
      "shadcn/no-restyle": "error",
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/require-static-classes": "error",
    }
    for (const code of cases) {
      const ids = lint(code, rules)
        .map((m) => m.ruleId)
        .sort()
      expect(ids).toEqual([
        "shadcn/no-arbitrary-values",
        "shadcn/no-raw-colors",
      ])
    }
  })
})
