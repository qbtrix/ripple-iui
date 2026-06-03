---
{
  "title": "Dialog Title — Accessible Heading with Typography Defaults",
  "summary": "Wraps bits-ui's `DialogPrimitive.Title` to render the dialog's primary heading with consistent typographic styling. The primitive handles ARIA role assignment automatically, making the title accessible to screen readers without manual `role` or `aria-labelledby` wiring.",
  "concepts": [
    "dialog title",
    "aria-labelledby",
    "accessibility",
    "WCAG",
    "bits-ui Title",
    "typography",
    "leading-none",
    "font-medium",
    "data-slot",
    "Svelte 5 runes",
    "cn utility"
  ],
  "categories": [
    "dialog",
    "accessibility",
    "ui-component"
  ],
  "source_docs": [
    "9f17cbe915a6fb7a"
  ],
  "backlinks": null,
  "word_count": 301,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DialogTitle` renders the main heading text of a dialog. Using the bits-ui primitive rather than a plain `<h2>` or `<p>` matters for accessibility: `DialogPrimitive.Title` renders a heading element and connects it to the parent `Dialog.Root` via `aria-labelledby` automatically. This wires the dialog's accessible name without the caller needing to manage IDs.

## Typography

The default class `text-base leading-none font-medium` establishes a restrained heading style:

- **`text-base`** — matches body text size, intentionally not `text-xl` or `text-lg`. Dialog titles in Ripple are compact, avoiding large-font headings that would compete with the surrounding page.
- **`leading-none`** — collapses line height to 1.0, which prevents extra vertical space above and below the title text, keeping it tight against the description or the first action element.
- **`font-medium`** — distinguishes the title from body copy (which is `font-normal`) without resorting to `font-bold`, which can feel heavy in small dialog panels.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | bindable | Exposed DOM reference via `bind:ref` |
| `class` | `string` | Merged with defaults via `cn()` |
| `...restProps` | `DialogPrimitive.TitleProps` | Full passthrough to bits-ui |

The `data-slot="dialog-title"` attribute is set on the rendered output to support CSS targeting and test selectors.

## Accessibility Implications

Bits-ui connects the title to the dialog root automatically by generating a stable ID and setting `aria-labelledby` on the dialog container. Consumers should always render a `DialogTitle` inside any `DialogContent` — omitting it removes the accessible name from the dialog, which fails WCAG 2.1 SC 4.1.2. If a visible title is undesirable for design reasons, the title can be visually hidden using a utility class while remaining in the DOM for screen readers.

## Known Gaps

None. The component is deliberately minimal — typography defaults and ref forwarding are its entire surface.