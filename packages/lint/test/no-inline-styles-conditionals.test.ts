// The common conditional idioms around a style object are not dynamic
// styles: each object branch is judged on its own, and undefined or
// null is nothing to judge.

import { describe, test } from "vitest"

import { noInlineStyles } from "../src/rules/no-inline-styles"
import { createTester } from "./helpers"

describe("no-inline-styles reads conditional style values", () => {
  test("branches are judged, undefined and null are nothing", () => {
    createTester().run("no-inline-styles", noInlineStyles as any, {
      valid: [
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open ? { "--x": "1" } : undefined} />`,
        },
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open && { "--x": "1" }} />`,
        },
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open ? { "--x": "1" } : { "--x": "0" }} />`,
        },
        // Both sides of ?? and || are values: the forwarded prop and a
        // default object.
        {
          code: `export const A = ({ style }: { style?: React.CSSProperties }) => <div style={style ?? { "--x": "1" }} />`,
        },
        {
          code: `const base = { "--x": "1" }\nexport const A = ({ style }: { style?: React.CSSProperties }) => <div style={style || base} />`,
        },
        { code: `export const A = () => <div style={undefined} />` },
        { code: `export const A = () => <div style={null} />` },
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={(open ? { "--x": "1" } : undefined) as React.CSSProperties} />`,
        },
      ],
      invalid: [
        // A branch that carries a raw color is still that finding.
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open ? { "--glow": "#ff00aa" } : undefined} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open && { "--glow": "rgb(0 0 0)" }} />`,
          errors: [{ messageId: "customPropColor" }],
        },
        // A branch that sets a property is an inline style.
        {
          code: `export const A = ({ open }: { open: boolean }) => <div style={open ? { color: "red" } : { "--x": "1" }} />`,
          errors: [{ messageId: "inlineStyle", data: { property: "color" } }],
        },
        // A branch that is opaque is still dynamic; the other is not.
        {
          code: `export const A = ({ open, s }: { open: boolean; s: React.CSSProperties }) => <div style={open ? s : { "--x": "1" }} />`,
          errors: [{ messageId: "dynamicStyle" }],
        },
      ],
    })
  })
})
