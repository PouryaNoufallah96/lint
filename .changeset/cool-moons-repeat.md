---
"@shadcn/lint": patch
---

Theme namespaces that share a prefix with a color utility are no longer
reported as undeclared colors. Declaring `--text-stat-label` makes
`text-stat-label` a font size and `--shadow-card-glow` makes
`shadow-card-glow` a box shadow, the way Tailwind reads them, and the
rules now read them the same way. `--inset-shadow-*`, `--drop-shadow-*`,
`--text-shadow-*`, and `--background-image-*` resolve the same way, and a
class declared with `@utility` counts as the project's own vocabulary.
