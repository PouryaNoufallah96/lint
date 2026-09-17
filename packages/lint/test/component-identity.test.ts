import * as fs from "node:fs"
import * as path from "node:path"
import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, test } from "vitest"

import { plugin } from "../src/index"
import { noRestyle } from "../src/rules/no-restyle"
import { createTester, PAGE, PROJECT } from "./helpers"

const tester = createTester()

const boundary = noRestyle as any

const appearance = () => ({ messageId: "appearanceClassWithVariants" })

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

describe("component identity follows the import", () => {
  test("renamed re-exports, namespace, memo and default wrappers, .js sources", () => {
    tester.run("no-restyle", boundary, {
      valid: [
        // A package's Button of the same name is not ours once the
        // import resolves into node_modules.
        {
          filename: PAGE,
          code: `import { Button } from "other-kit"\nexport const A = () => <Button className="bg-red-500" />`,
        },
      ],
      invalid: [
        {
          filename: PAGE,
          code: `import { Action } from "@/components/barrel"\nexport const A = () => <Action className="bg-red-500">Go</Action>`,
          errors: [appearance()],
        },
        {
          filename: PAGE,
          code: `import { Save } from "@/components/barrel"\nexport const A = () => <Save className="bg-red-500">Go</Save>`,
          errors: [{ messageId: "appearanceClassViaWrapper" }],
        },
        {
          filename: PAGE,
          code: `import { NamespaceButton } from "@/components/namespace-wrapper"\nexport const A = () => <NamespaceButton className="bg-red-500">Go</NamespaceButton>`,
          errors: [{ messageId: "appearanceClassViaWrapper" }],
        },
        {
          filename: PAGE,
          code: `import { MemoButton } from "@/components/memo-wrapper"\nexport const A = () => <MemoButton className="bg-red-500">Go</MemoButton>`,
          errors: [{ messageId: "appearanceClassViaWrapper" }],
        },
        {
          filename: PAGE,
          code: `import Save from "@/components/default-wrapper"\nexport const A = () => <Save className="bg-red-500">Go</Save>`,
          errors: [{ messageId: "appearanceClassViaWrapper" }],
        },
        {
          filename: PAGE,
          code: `import { LegacyChip } from "@/components/ui/legacy-chip"\nexport const A = () => <LegacyChip className="bg-red-500" />`,
          errors: [{ messageId: "appearanceClassNoVariants" }],
        },
      ],
    })
  })
})

describe("identity through barrels and path casing", () => {
  const caseInsensitive = fs.existsSync(
    path.join(PROJECT, "COMPONENTS/UI/BUTTON.TSX")
  )
  test("import-then-export barrels keep the component", () => {
    tester.run("no-restyle", noRestyle as any, {
      valid: [],
      invalid: [
        {
          filename: PAGE,
          code: `import { Action } from "@/components/rebound-barrel"\nexport const A = () => <Action className="bg-red-500">Go</Action>`,
          errors: [{ messageId: "appearanceClassWithVariants" }],
        },
        {
          filename: PAGE,
          code: `import { Save2 } from "@/components/rebound-barrel"\nexport const A = () => <Save2 className="bg-red-500">Go</Save2>`,
          errors: [{ messageId: "appearanceClassViaWrapper" }],
        },
      ],
    })
  })
  test.skipIf(!caseInsensitive)(
    "a differently cased import path is the same file",
    () => {
      const messages = lint(
        `import { Button } from "@/COMPONENTS/UI/BUTTON"\nexport const A = () => <Button className="bg-red-500">Go</Button>`,
        { "shadcn/no-restyle": "error" }
      )
      expect(messages.map((m) => m.ruleId)).toEqual(["shadcn/no-restyle"])
    }
  )
})

describe("default wrapper names", () => {
  test("a default-imported wrapper is named by its local name", () => {
    const [message] = lint(
      `import Save from "@/components/default-wrapper"\nexport const A = () => <Save className="bg-red-500">Go</Save>`,
      { "shadcn/no-restyle": "error" }
    )
    expect(message.message).toContain("<Save> forwards className to <Button>")
  })
})
