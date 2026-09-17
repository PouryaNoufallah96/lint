import { describe, test } from "vitest"

import { noInlineStyles } from "../src/rules/no-inline-styles"
import { createTester, PAGE } from "./helpers"

const tester = createTester()

describe("no-inline-styles", () => {
  test("rule", () => {
    tester.run("no-inline-styles", noInlineStyles as any, {
      valid: [
        { code: `export const A = () => <div className="p-4" />` },
        {
          code: `export const A = ({ w }: { w: string }) => <div style={{ "--sidebar-width": w }} />`,
        },
        { code: `export const A = () => <div style={{ "--gap": "8px" }} />` },
        // A forwarded style prop, with or without the cast.
        {
          code: `export const A = ({ style }: { style?: React.CSSProperties }) => <div style={{ "--w": 4, ...style } as React.CSSProperties} />`,
        },
        // A custom property fed from a token, one hop away.
        {
          code: `const tones = { brand: "var(--color-brand)", muted: "var(--color-muted)" }\nexport const A = ({ tone }: { tone: keyof typeof tones }) => <div style={{ "--ring": tones[tone] }} />`,
        },
      ],
      invalid: [
        // A contract's own words reach a style the collector cannot
        // read, the same as they reach a property finding.
        {
          code: `declare function defaults(): { style?: React.CSSProperties }\nexport const A = ({ style }: { style?: React.CSSProperties } = defaults()) => <Box style={style} />`,
          options: [
            {
              contracts: [
                {
                  pattern: "^Box$",
                  message: "<Box> takes its style from the theme.",
                },
              ],
            },
          ],
          errors: [{ message: "<Box> takes its style from the theme." }],
        },
        // CSS text in a <style> element is outside the system.
        {
          code: `export const A = () => <><style>{".glow { box-shadow: 0 0 40px rgba(59,130,246,.3) }"}</style><div className="glow" /></>`,
          errors: [{ messageId: "styleElement" }],
        },
        // A raw color laundered through a variable into a custom property.
        {
          code: `const glow = "rgba(59, 130, 246, 0.15)"\nexport const A = () => <div style={{ "--glow": glow }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        // ...or through a lookup table.
        {
          code: `const glowColorMap = { blue: "rgba(59, 130, 246, 0.15)", slate: "rgba(148, 163, 184, 0.15)" }\nexport const A = ({ tone }: { tone: "blue" | "slate" }) => { const c = glowColorMap[tone]; return <div style={{ "--glow-shadow-color": c }} /> }`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          code: `export const A = () => <div style={{ backgroundColor: "#FF6B35", padding: 13 }} />`,
          errors: [{ messageId: "inlineStyle" }, { messageId: "inlineStyle" }],
        },
        {
          code: `export const A = ({ w }: { w: string }) => <div style={{ "--w": w, color: "red" }} />`,
          errors: [{ messageId: "inlineStyle" }],
        },
        {
          code: `export const A = () => <div style={{ "--x": "#ff00aa" }} className="bg-(--x)" />`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          code: `export const A = () => <div style={{ "--tint": "oklch(0.6 0.2 20)" }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          code: `export const A = ({ s }: { s: React.CSSProperties }) => <div style={s} />`,
          errors: [{ messageId: "dynamicStyle" }],
        },
        {
          code: `export const A = ({ s }: { s: object }) => <div style={{ ...s }} />`,
          errors: [{ messageId: "dynamicStyle" }],
        },
      ],
    })
  })
})

describe("inline custom properties", () => {
  test("named colors and hwb() are raw colors too", () => {
    tester.run("no-inline-styles", noInlineStyles as any, {
      valid: [
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--bg": "var(--color-primary)" }} />`,
        },
      ],
      invalid: [
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--bg": "red" }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--bg": "hwb(0 0% 0%)" }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        // A style object spread onto the element.
        {
          filename: PAGE,
          code: `export const A = () => <div {...{ style: { color: "red" } }} />`,
          errors: [{ messageId: "inlineStyle" }],
        },
      ],
    })
  })
})

describe("no-inline-styles resolves local style objects", () => {
  test("a local object named style is judged, a received prop is not", () => {
    tester.run("no-inline-styles", noInlineStyles as any, {
      valid: [
        {
          code: `export const A = ({ style }: { style?: React.CSSProperties }) => <div style={style} />`,
        },
        {
          code: `const style = { "--gap": "8px" }\nexport const A = () => <div style={style} />`,
        },
        {
          code: `const theme = { style: { "--gap": "8px" } }\nexport const A = () => <div style={theme.style} />`,
        },
      ],
      invalid: [
        {
          code: `const style = { color: "#ff0000" }\nexport const A = () => <div style={style} />`,
          errors: [{ messageId: "inlineStyle" }],
        },
        {
          code: `const theme = { style: { backgroundColor: "red" } }\nexport const A = () => <div style={theme.style} />`,
          errors: [{ messageId: "inlineStyle" }],
        },
        {
          code: `const base = { padding: 4 }\nexport const A = () => <div style={{ "--x": 1, ...base }} />`,
          errors: [{ messageId: "inlineStyle" }],
        },
      ],
    })
  })
})

describe("colors in templates and gradient stops", () => {
  test("named colors are found wherever they stand alone", () => {
    tester.run("no-inline-styles", noInlineStyles as any, {
      valid: [
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--icon": "url(orange-icon.svg)" }} />`,
        },
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--paint": \`var(--color-primary)\` }} />`,
        },
      ],
      invalid: [
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--paint": \`rebeccapurple\` }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          filename: PAGE,
          code: `export const A = () => <div style={{ "--paint": "linear-gradient(red, blue)" }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
      ],
    })
  })
})

describe("allow", () => {
  test("an allowed property is not judged; the rest still are", () => {
    tester.run("no-inline-styles", noInlineStyles as any, {
      valid: [
        {
          code: `export const A = ({ x }: { x: number }) => <div style={{ transform: \`translateX(\${x}px)\` }} />`,
          options: [{ allow: ["transform"] }],
        },
        // Either spelling names the property, and a glob covers a family.
        {
          code: `export const A = () => <div style={{ backgroundColor: "violet" }} />`,
          options: [{ allow: ["background-color"] }],
        },
        {
          code: `export const A = () => <div style={{ borderColor: "red", borderWidth: 2 }} />`,
          options: [{ allow: ["border-*"] }],
        },
      ],
      invalid: [
        {
          code: `export const A = () => <div style={{ backgroundColor: "violet", color: "blue" }} />`,
          options: [{ allow: ["backgroundColor"] }],
          errors: [{ messageId: "inlineStyle", data: { property: "color" } }],
        },
        // A class is not a property name. The mistake is reported on line 1.
        {
          code: `export const A = () => <div className="p-4" />`,
          options: [{ allow: ["bg-red-500"] }],
          errors: [
            { message: /entry "bg-red-500" is not a CSS property name/ },
          ],
        },
      ],
    })
  })
})
