---
{
  "title": "Popover Description — Muted Supporting Text Block",
  "summary": "A minimal layout component that renders supporting text inside a popover with muted color styling. It is a plain `\u003cdiv\u003e` wrapper — unlike its dialog counterpart, it does not use the bits-ui `Description` primitive and therefore does not set `aria-describedby` automatically.",
  "concepts": [
    "popover description",
    "muted foreground",
    "text-muted-foreground",
    "aria-describedby",
    "non-modal accessibility",
    "data-slot",
    "WithElementRef",
    "Svelte 5 runes",
    "cn utility"
  ],
  "categories": [
    "popover",
    "accessibility",
    "ui-component"
  ],
  "source_docs": [
    "3ccedd4ef3312b03"
  ],
  "backlinks": null,
  "word_count": 253,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`PopoverDescription` provides a styled container for secondary text inside a popover, such as a brief explanation of what the popover's controls do. Its single style contribution is `text-muted-foreground`, which renders the text in the theme's muted color (typically a gray variant) to visually de-emphasize it relative to the title.

## Implementation Note: Plain div vs. Primitive

Unlike `DialogDescription`, which wraps `DialogPrimitive.Description` and connects to `aria-describedby` on the dialog root, `PopoverDescription` wraps a plain `<div>`:

```svelte
<div
  bind:this={ref}
  data-slot="popover-description"
  class={cn("text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

Popovers are non-modal and generally do not require the same accessibility wiring as dialogs. The ARIA specification does not mandate `aria-describedby` for non-modal disclosures the way it does for modal dialogs (where `aria-describedby` helps screen reader users understand the dialog's purpose before navigating into it). The plain div is therefore sufficient for most popover use cases.

However, for popovers that function as informational tooltips or instructional panels, callers may want to manually add `id` to `PopoverDescription` and `aria-describedby` on the trigger or content element.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement \| null` | Bindable DOM reference |
| `class` | `string` | Merged via `cn()` |
| `children` | snippet | Rendered inside the div |
| `...restProps` | `HTMLAttributes<HTMLDivElement>` | Forwarded to root div |

## Known Gaps

For accessibility-sensitive popovers (e.g., those serving as instructional overlays), the lack of an automatic `aria-describedby` connection may be a gap. Callers must add this wiring manually if needed.