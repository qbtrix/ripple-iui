---
{
  "title": "Card — Root Container with Size Variants and Image-Aware Layout",
  "summary": "The root Card component is the orchestrating container for the card system. It exposes a `size` prop that propagates layout hints to all descendant sub-components via `data-size`, and it uses CSS selectors to handle image children, footer presence, and ring styling without any JavaScript.",
  "concepts": [
    "card root",
    "size variants",
    "data-size",
    "group/card context",
    "image-aware layout",
    "has-data selectors",
    "overflow-hidden",
    "ring styling",
    "Svelte 5 $props",
    "Tailwind CSS"
  ],
  "categories": [
    "widget",
    "layout",
    "card"
  ],
  "source_docs": [
    "4a564e623d1c8bf0"
  ],
  "backlinks": null,
  "word_count": 416,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`card.svelte` is the outermost container of the card composition system. It is not a presentational leaf — it is the layout orchestrator that establishes the context all sub-components rely on.

## Size Propagation via `data-size`

The card's `size` prop (`"default"` | `"sm"`) is written to the DOM as `data-size={size}`. All descendant components (header, footer, title) read this through Tailwind's `group-data-[size=sm]/card:` variant. This pattern avoids Svelte context or prop drilling — a single DOM attribute acts as a shared communication channel between the root and all children.

The `group/card` class name establishes the named group scope so the `group-data-[size=sm]/card:` selectors in children resolve against this specific ancestor, not any arbitrary ancestor that happens to use `group`.

## Image-Aware Edge Rounding

```
has-[>img:first-child]:pt-0
*:[img:first-child]:rounded-t-xl
*:[img:last-child]:rounded-b-xl
```

When an `<img>` appears as the first child, the card removes its top padding so the image bleeds to the card edge. It then rounds the image's top corners to match the card's `rounded-xl` shape. Without these rules, an image placed at the top of a card would have a gap of padding above it and sharp corners against the card's rounded boundary — a jarring visual mismatch common in naive card implementations.

The same pattern applies to a bottom image: bottom corners are rounded to match the card edge.

## Footer-Aware Bottom Padding

```
has-data-[slot=card-footer]:pb-0
```

When a `CardFooter` child is present (detected via `data-slot`), the card removes its own bottom padding. The footer manages its own padding, and this prevents double-padding at the card's bottom edge — a common layout bug in composable card systems where both container and child add padding independently.

## Visual Styling Rationale

- `ring-foreground/10 ring-1` — A subtle 1px ring provides a soft border that works in both light and dark themes using opacity-scaled foreground color, avoiding the visual discontinuity of fixed `border-gray-200` values.
- `overflow-hidden` — Clips any child content (especially images, expanded scrollable areas) that might overflow the `rounded-xl` boundary.
- `gap-4` / `data-[size=sm]:gap-3` — Consistent vertical rhythm between sub-components, reduced proportionally in compact mode.

## Props

```svelte
let {
  ref = $bindable(null),
  class: className,
  children,
  size = "default",
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { size?: "default" | "sm" } = $props();
```

The `size` union type is constrained at the TypeScript level, preventing invalid string values from reaching the DOM attribute and corrupting the CSS group-data selectors.

## Known Gaps

None identified. The size system currently supports two variants; extending to `"lg"` would require adding new `data-[size=lg]:` rules across all sub-components.
