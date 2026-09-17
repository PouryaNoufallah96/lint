---
"@shadcn/lint": patch
---

A theme that imports a pnpm-installed package now builds. Such a package
is a link into `node_modules/.pnpm` and its own dependencies sit beside
the real file, so an `@import` inside it is resolved from there instead of
from the link. Before, the theme failed to build and `no-unknown-classes`
fell back to the bundled grammar, reporting a project's own `@utility` as
unknown.
