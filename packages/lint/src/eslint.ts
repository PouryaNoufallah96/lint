// Optional editor completions for ESLint users. Kept outside the main entry so
// standalone and Biome users never resolve ESLint declarations.
import type {} from "@eslint/core"

export {}

// Editor completion for the rule names: ESLint types `rules` with a
// string index signature, so nothing completes for a plugin's rules until
// they are named here.
//
// This block is the single source for editor completion; scripts/postbuild.mjs
// copies it into dist/eslint.d.ts (and the CJS twin) because the dts bundler
// drops augmentations. Keep it self-contained, and in step with
// plugin.rules (test/eslint-completion.test.ts checks both).
declare module "@eslint/core" {
  interface RulesConfig {
    "shadcn/no-restyle"?: import("@eslint/core").RuleConfig<
      [
        {
          allow?: string[]
          deny?: string[]
          message?:
            | string
            | Partial<
                Record<
                  | "default"
                  | "layout"
                  | "color"
                  | "typography"
                  | "spacing"
                  | "shape"
                  | "effects"
                  | "motion",
                  string
                >
              >
          componentImports?: string[]
          ignoreImports?: string[]
          mergeFunctions?: string[]
          variantFunctions?: string[]
          contracts?: {
            pattern: string
            allow?: string[]
            deny?: string[]
            message?:
              | string
              | Partial<
                  Record<
                    | "default"
                    | "layout"
                    | "color"
                    | "typography"
                    | "spacing"
                    | "shape"
                    | "effects"
                    | "motion",
                    string
                  >
                >
          }[]
        },
      ]
    >
    "shadcn/no-raw-colors"?: import("@eslint/core").RuleConfig<
      [
        {
          allow?: string[]
          deny?: string[]
          contracts?: {
            pattern: string
            allow?: string[]
            deny?: string[]
            message?: string
          }[]
          message?: string
          scanAllStrings?: boolean
          componentImports?: string[]
          ignoreImports?: string[]
          mergeFunctions?: string[]
          variantFunctions?: string[]
        },
      ]
    >
    "shadcn/no-arbitrary-values"?: import("@eslint/core").RuleConfig<
      [
        {
          allow?: string[]
          deny?: string[]
          contracts?: {
            pattern: string
            allow?: string[]
            deny?: string[]
            message?: string
          }[]
          message?: string
          scanAllStrings?: boolean
          componentImports?: string[]
          ignoreImports?: string[]
          mergeFunctions?: string[]
          variantFunctions?: string[]
        },
      ]
    >
    "shadcn/no-inline-styles"?: import("@eslint/core").RuleConfig<
      [
        {
          allow?: string[]
          deny?: string[]
          contracts?: {
            pattern: string
            allow?: string[]
            deny?: string[]
            message?: string
          }[]
          message?: string
        },
      ]
    >
    "shadcn/require-static-classes"?: import("@eslint/core").RuleConfig<
      [
        {
          message?: string
          componentImports?: string[]
          ignoreImports?: string[]
          mergeFunctions?: string[]
          variantFunctions?: string[]
        },
      ]
    >
    "shadcn/no-unknown-classes"?: import("@eslint/core").RuleConfig<
      [
        {
          allow?: string[]
          deny?: string[]
          contracts?: {
            pattern: string
            allow?: string[]
            deny?: string[]
            message?: string
          }[]
          message?: string
          componentImports?: string[]
          ignoreImports?: string[]
          mergeFunctions?: string[]
          variantFunctions?: string[]
        },
      ]
    >
  }
}
