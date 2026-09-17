---
"@shadcn/lint": patch
---

A `render` prop now decides which component wears the classes. Base UI
renders another component in a trigger's place, so
`<DialogTrigger render={<Button />} className="bg-primary" />` is a
Button: the finding names Button, and the suggestion lists Button's
variants instead of reporting a trigger that defines none. A trigger that
renders a plain element — `render={<span />}` — restyles nothing in the
design system and is no longer reported.
