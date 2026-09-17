---
"@shadcn/lint": patch
---

`no-unknown-classes` no longer reports every stock class when
`components.json` points `tailwind.css` at a partial that declares tokens
without importing Tailwind, the usual shape for a component package in a
monorepo. A theme built from that file knows no base utilities, so `p-4`
and `text-sm` read as unknown, silently. The linter now warns once and
asks a discovered entry which classes Tailwind knows, while the configured
file stays the theme: its tokens are the project's, and it is still the
file the messages name for a new token or `@utility`.
