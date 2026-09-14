import * as path from "node:path"
import { fileURLToPath } from "node:url"
import parser from "@typescript-eslint/parser"
import { RuleTester } from "eslint"

export const PROJECT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/project"
)

// A file inside the fixture project, so components.json, the theme,
// and the ui components resolve.
export const PAGE = path.join(PROJECT, "app/page.tsx")

// A file outside any project.
export const OUTSIDE = "/nonexistent/app/page.tsx"

export function createTester() {
  return new RuleTester({
    languageOptions: {
      parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  })
}

export const button = `import { Button } from "@/components/ui/button"`
export const card = `import { Card, CardContent, CardTitle } from "@/components/ui/card"`
export const cn = `import { cn } from "@/lib/utils"`
