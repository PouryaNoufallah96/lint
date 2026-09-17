// The complete policy from docs/rules.md, a design team's rules for a
// shadcn install, run against the fixture project. It exercises what a
// single-contract test cannot: a top-level policy under contracts that
// restate it, a component with no variants, a component no contract
// names, and which words a finding gets. Keep the config in step with
// the docs.

import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, test } from "vitest"

import { plugin } from "../src/index"
import { PAGE, PROJECT } from "./helpers"

// A contract is its components' whole policy, so each one that keeps
// the top-level rules says so again.
const MARGINS = [
  "m",
  "mx",
  "my",
  "ms",
  "me",
  "mbs",
  "mbe",
  "mt",
  "mr",
  "mb",
  "ml",
]
const NO_MARGINS =
  "No margins on <{{component}}>. Space between components is the container's: use gap, or a Stack."
const VARIANTS_ONLY =
  "Appearance on <{{component}}> comes from its variants: {{variants|none yet}}. Add one in {{file}} if the design calls for it."

const policy = {
  // Every component may be placed on the page; none carries its own margin.
  allow: ["layout"],
  deny: MARGINS,
  contracts: [
    // Containers own their padding.
    {
      pattern: "^Card$|(Content|Header|Footer|Group|Panel)$",
      allow: ["layout", "spacing"],
      deny: MARGINS,
      message: { layout: NO_MARGINS, default: VARIANTS_ONLY },
    },
    {
      pattern: "^(Alert|ScrollArea|SidebarInset|TabsList|Toolbar)$",
      allow: ["layout", "spacing"],
      deny: MARGINS,
      message: { layout: NO_MARGINS, default: VARIANTS_ONLY },
    },
    {
      pattern: "(Title|Description)$|^Label$|^FormLabel$",
      allow: ["layout", "typography"],
      deny: MARGINS,
      message: {
        layout: NO_MARGINS,
        color:
          "Text color on <{{component}}> is a token through a variant, not a class.",
        default: VARIANTS_ONLY,
      },
    },
    {
      pattern: "^Table(Head|Cell)$",
      allow: ["layout", "font-weight", "tabular-nums", "lining-nums"],
      deny: MARGINS,
    },
    { pattern: "^TableRow$", allow: ["layout", "bg-color"], deny: MARGINS },
    {
      pattern: "^(Input|Textarea|SelectTrigger)$",
      allow: ["layout", "font-mono"],
      deny: MARGINS,
    },
    {
      pattern: "^Avatar$",
      allow: ["size-*"],
      message:
        'An <{{component}}> takes a size (size-8, size-10) and nothing else; "{{className}}" is not a size.',
    },
    {
      pattern: "^Badge$",
      allow: ["layout"],
      deny: MARGINS,
      message: {
        layout: NO_MARGINS,
        default:
          'A <{{component}}> is one of its variants: {{variants}}. "{{className}}" is not a variant.',
      },
    },
    { pattern: "^Skeleton$", allow: ["layout", "rounded"], deny: MARGINS },
    {
      pattern: "^Button$",
      allow: ["layout"],
      deny: [...MARGINS, "w-*", "min-w-*", "max-w-*", "size-*"],
      message: {
        layout:
          "\"{{className}}\" is not a <{{component}}>'s to set: it sizes to its label, and space around it is the container's. Put w-full on the form row and use gap between controls.",
        spacing: "Padding on a <{{component}}> is its size: {{sizes}}.",
        color:
          "Button color is a variant: {{variants}}. A new treatment is a new variant in {{file}}, not a class.",
      },
    },
  ],
}

const BUTTON_LAYOUT = (className: string) =>
  `"${className}" is not a <Button>'s to set: it sizes to its label, and space around it is the container's. Put w-full on the form row and use gap between controls.`

const cases: [string, string | null][] = [
  ['<Button className="mt-4">', BUTTON_LAYOUT("mt-4")],
  ['<Button className="mbs-4">', BUTTON_LAYOUT("mbs-4")],
  ['<Button className="w-full">', BUTTON_LAYOUT("w-full")],
  ['<Button className="size-10">', BUTTON_LAYOUT("size-10")],
  [
    '<Button className="p-6">',
    "Padding on a <Button> is its size: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg.",
  ],
  [
    '<Button className="bg-red-500">',
    "Button color is a variant: default, outline, secondary, ghost, destructive, link. A new treatment is a new variant in components/ui/button.tsx, not a class.",
  ],
  ['<Button className="col-span-2 self-end">', null],
  ['<CardTitle className="text-xs font-medium tracking-tight">', null],
  [
    '<CardTitle className="text-red-500">',
    "Text color on <CardTitle> is a token through a variant, not a class.",
  ],
  // A contract that restates the margin rule reports it in the same words.
  [
    '<CardTitle className="mt-4">',
    "No margins on <CardTitle>. Space between components is the container's: use gap, or a Stack.",
  ],
  ['<CardContent className="px-2 pt-0">', null],
  [
    '<Card className="shadow-lg">',
    "Appearance on <Card> comes from its variants: none yet. Add one in components/ui/card.tsx if the design calls for it.",
  ],
  // A component no contract names takes the top-level policy, which has
  // no words of its own.
  ['<Field className="w-full">', null],
  [
    '<Field className="mt-4">',
    `"mt-4" is not allowed on <Field>: its contract denies ${MARGINS.join(" ")}.`,
  ],
]

describe("a complete policy for a shadcn install", () => {
  const linter = new Linter({ cwd: PROJECT })
  test.each(cases)("%s", (jsx, expected) => {
    const code = [
      `import { Button } from "@/components/ui/button"`,
      `import { Card, CardContent, CardTitle } from "@/components/ui/card"`,
      `import { Field } from "@/components/ui/field"`,
      `export const A = () => ${jsx}x</${jsx.slice(1).split(" ")[0]}>`,
    ].join("\n")
    const messages = linter.verify(
      code,
      [
        {
          files: ["**/*.tsx"],
          languageOptions: {
            parser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { shadcn: plugin },
          rules: { "shadcn/no-restyle": ["error", policy] },
        },
      ] as any,
      { filename: PAGE }
    )
    if (expected === null) expect(messages).toEqual([])
    else expect(messages.map((m) => m.message)).toEqual([expected])
  })
})
