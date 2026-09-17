---
"@shadcn/lint": patch
---

`no-restyle` no longer calls a class your own CSS declares a misspelling.
A class declared with `@utility`, through an `@utility` prefix, or as a
plain selector is still `unclassified` — the rule cannot read what it
changes, so a contract still decides — but it is now reported in its own
words instead of "Fix the spelling, or use a class Tailwind generates",
which sent agents looking for a typo in a class Tailwind does generate.
