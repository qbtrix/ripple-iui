---
{
  "title": "Popover Header — Compact Title and Description Stack",
  "summary": "A lightweight layout wrapper that groups title and description elements inside a popover with tight vertical spacing. Mirrors the structure of `DialogHeader` but uses a smaller gap and text size appropriate for the popover's more compact panel format.",
  "concepts": [
    "popover header",
    "flex layout",
    "gap-0.5",
    "text-sm",
    "data-slot",
    "WithElementRef",
    "Svelte 5 runes",
    "cn utility",
    "compact layout",
    "DialogHeader comparison"
  ],
  "categories": [
    "popover",
    "layout",
    "ui-component"
  ],
  "source_docs": [
    "94b533f298b10156"
  ],
  "backlinks": null,
  "word_count": 259,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`PopoverHeader` provides the structural grouping for a popover's title and description, establishing consistent vertical spacing between them. It is the popover-specific counterpart to `DialogHeader`, adapted for the smaller surface area a popover panel occupies.

## Layout Differences vs. DialogHeader

Comparing the two headers:

- `DialogHeader`: `flex flex-col gap-2` — 0.5rem gap, no text-size default
- `PopoverHeader`: `flex flex-col gap-0.5 text-sm` — 0.125rem gap, 14px text size

The reduced gap (`gap-0.5` vs `gap-2`) reflects the popover's compact nature — the title and description sit closer together because the overall panel is smaller. The `text-sm` default scales down the text inside the header, since popovers appear near their triggers at normal reading distance and do not benefit from the larger text that dialogs use (which are centered on screen and viewed at a distance).

## Composition Pattern

```svelte
<PopoverContent>
  <PopoverHeader>
    <PopoverTitle>Filter Options</PopoverTitle>
    <PopoverDescription>Narrow results by date and category.</PopoverDescription>
  </PopoverHeader>
  <!-- controls -->
</PopoverContent>
```

The header groups title and description as a semantic unit inside the content panel, visually distinguishing them from the interactive controls that follow.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement \| null` | Bindable DOM reference |
| `class` | `string` | Merged via `cn()` |
| `children` | snippet | Rendered inside the div |
| `...restProps` | `HTMLAttributes<HTMLDivElement>` | Forwarded to root div |

The `data-slot="popover-header"` attribute enables structural CSS targeting consistent with all other Ripple slot-bearing components.

## Known Gaps

None. The component is intentionally minimal — spacing and text-size defaults are its entire contribution.