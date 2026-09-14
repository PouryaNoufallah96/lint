// A palette name the theme declares (--color-gray-100) is a token of
// that theme: bg-gray-100 is on-system there and must not be reported
// as the raw palette, nor offered as its own replacement.

import * as path from "node:path"
import { describe, test } from "vitest"

import { noRawColors } from "../src/rules/no-raw-colors"
import { createTester, PROJECT } from "./helpers"

const PAGE = path.join(path.dirname(PROJECT), "palette-theme/app/page.tsx")

describe("no-raw-colors with a declared palette name", () => {
  test("the declared name passes, the rest of the family is still raw", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [
        {
          filename: PAGE,
          code: `export const A = () => <div className="bg-gray-100 hover:text-gray-100/50 border-primary" />`,
        },
      ],
      invalid: [
        {
          filename: PAGE,
          code: `export const A = () => <div className="bg-gray-200" />`,
          errors: [
            {
              messageId: "paletteClassNear",
              data: {
                className: "bg-gray-200",
                suggestions: "bg-gray-100",
                tokens: "gray-100, primary",
                file: "test/fixtures/palette-theme/app/globals.css",
              },
              suggestions: [
                {
                  messageId: "useToken",
                  data: { replacement: "bg-gray-100" },
                  output: `export const A = () => <div className="bg-gray-100" />`,
                },
              ],
            },
          ],
        },
      ],
    })
  })
})
