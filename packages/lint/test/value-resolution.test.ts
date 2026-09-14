import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, test } from "vitest"

import { plugin } from "../src/index"
import { button, cn, PAGE, PROJECT } from "./helpers"

function expectReports(
  code: string,
  expected: { rule: string; messageId: string; at: string; last?: boolean }[]
) {
  const source = `${button}\n${cn}\n${code}`
  const messages = new Linter({ cwd: PROJECT }).verify(
    source,
    {
      files: ["**/*.tsx"],
      languageOptions: {
        parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { shadcn: plugin },
      rules: {
        "shadcn/no-restyle": "error",
        "shadcn/require-static-classes": "error",
        "shadcn/no-inline-styles": "error",
        "shadcn/no-raw-colors": "error",
      },
    } as any,
    { filename: PAGE }
  )
  function offset(line: number, column: number) {
    const previousLines = source.split("\n").slice(0, line - 1)
    return (
      previousLines.reduce((total, text) => total + text.length + 1, 0) +
      column -
      1
    )
  }
  const actual = messages.map((message) => ({
    rule: message.ruleId,
    messageId: message.messageId,
    range: [
      offset(message.line, message.column),
      offset(message.endLine!, message.endColumn!),
    ],
  }))
  const reports = expected.map(({ rule, messageId, at, last }) => {
    const start = last ? source.lastIndexOf(at) : source.indexOf(at)
    expect(start).toBeGreaterThanOrEqual(0)
    return {
      rule: `shadcn/${rule}`,
      messageId,
      range: [start, start + at.length],
    }
  })
  function compare(a: unknown, b: unknown) {
    return JSON.stringify(a).localeCompare(JSON.stringify(b))
  }
  expect(actual.sort(compare)).toEqual(reports.sort(compare))
}

describe("shared value resolution preserves rule policy", () => {
  test("both destructured fallbacks and default-object values are authored alternatives", () => {
    const code =
      'function View({ className: classes = "bg-red-500", style: inline = { color: "red" } } = { className: "rounded-full", style: { padding: 4 } }) { return <Button className={classes} style={inline} /> }'
    expectReports(code, [
      {
        rule: "no-restyle",
        messageId: "appearanceClassWithVariants",
        at: '"bg-red-500"',
      },
      {
        rule: "no-raw-colors",
        messageId: "paletteClassNear",
        at: '"bg-red-500"',
      },
      {
        rule: "no-restyle",
        messageId: "appearanceClassWithVariants",
        at: '"rounded-full"',
      },
      { rule: "no-inline-styles", messageId: "inlineStyle", at: '"red"' },
      { rule: "no-inline-styles", messageId: "inlineStyle", at: "4" },
    ])
  })

  test("unknown default objects retain each rule's reporting node after local fallbacks", () => {
    const parameter =
      '{ className: classes = "bg-red-500", style: inline = { color: "red" } } = build()'
    const code = `function View(${parameter}) { return <Button className={classes} style={inline} /> }`
    expectReports(code, [
      {
        rule: "no-restyle",
        messageId: "appearanceClassWithVariants",
        at: '"bg-red-500"',
      },
      {
        rule: "no-raw-colors",
        messageId: "paletteClassNear",
        at: '"bg-red-500"',
      },
      {
        rule: "require-static-classes",
        messageId: "dynamicClasses",
        at: parameter,
      },
      { rule: "no-inline-styles", messageId: "inlineStyle", at: '"red"' },
      {
        rule: "no-inline-styles",
        messageId: "dynamicStyle",
        at: "inline",
        last: true,
      },
    ])
  })

  test("a readable default object with missing properties has no authored value", () => {
    expectReports(
      "function View(props = {}) { return <Button className={props.className} style={props.style} /> }",
      []
    )
  })

  test("empty member keys stay unreadable for classes and readable for styles", () => {
    const code =
      'const classes = { "": "bg-red-500" }; const styles = { "": { color: "red" } }; <Button className={classes[""]} style={styles[""]} />'
    expectReports(code, [
      {
        rule: "require-static-classes",
        messageId: "dynamicClasses",
        at: 'classes[""]',
      },
      { rule: "no-inline-styles", messageId: "inlineStyle", at: '"red"' },
    ])
  })

  test("unknown member overwrites retain the member expression as the report site", () => {
    const code =
      'const theme = { className: "w-full", style: { "--gap": "4px" }, ...opaque }; <Button className={theme.className} style={theme.style} />'
    expectReports(code, [
      {
        rule: "require-static-classes",
        messageId: "dynamicClasses",
        at: "theme.className",
      },
      {
        rule: "no-inline-styles",
        messageId: "dynamicStyle",
        at: "theme.style",
      },
    ])
  })

  test("computed keys and wrapped member receivers retain the final value's node", () => {
    const code =
      'const theme = { ...{ className: "bg-red-500", style: { color: "red" } } }; <Button className={(theme as object)[`className`]} style={(theme satisfies object)["style"]} />'
    expectReports(code, [
      {
        rule: "no-restyle",
        messageId: "appearanceClassWithVariants",
        at: '"bg-red-500"',
      },
      {
        rule: "no-raw-colors",
        messageId: "paletteClassNear",
        at: '"bg-red-500"',
      },
      { rule: "no-inline-styles", messageId: "inlineStyle", at: '"red"' },
    ])
  })

  test("a wrapped member receiver leaves the helper's vocabulary at the call", () => {
    // The cn() call is a site of its own and owns the vocabulary check.
    // The attribute that reads it through a cast judges the boundary
    // and does not report the palette class a second time.
    const code =
      'const theme = { className: cn("bg-red-500") }; <Button className={(theme as object).className} />'
    expectReports(code, [
      {
        rule: "no-restyle",
        messageId: "appearanceClassWithVariants",
        at: '"bg-red-500"',
      },
      {
        rule: "no-raw-colors",
        messageId: "paletteClassNear",
        at: '"bg-red-500"',
      },
    ])
  })

  test("forwarded defaults revisited on the active path retain rule-specific treatment", () => {
    const code =
      "function View({ className = className, style = style }) { return <Button className={className} style={style} /> }"
    expectReports(code, [
      {
        rule: "no-inline-styles",
        messageId: "dynamicStyle",
        at: "style",
        last: true,
      },
    ])
  })
})
