---
"@shadcn/lint": patch
---

Astro's `class:list` is now a class site. Every class rule read `class` and
skipped `class:list`, so a component that kept its classes there passed
silently. Strings, arrays, and objects in `class:list` are read the same way
as `clsx` arguments.
