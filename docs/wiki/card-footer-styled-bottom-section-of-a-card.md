---
{
  "title": "Card Footer — Styled Bottom Section of a Card",
  "summary": "CardFooter is the bottom-zone wrapper inside a card layout. It applies a muted background, rounded bottom corners, a top border, and responsive padding that automatically adjusts when the parent card is in `size=sm` mode.",
  "concepts": [
    "card-footer",
    "Svelte 5 snippets",
    "group-data variants",
    "Tailwind CSS",
    "data-slot",
    "WithElementRef",
    "cn utility",
    "responsive padding",
    "card layout",
    "composable UI"
  ],
  "categories": [
    "widget",
    "layout",
    "card"
  ],
  "source_docs": [
    "fd5ee2b16448a222"
  ],
  "backlinks": null,
  "word_count": 429,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `card-footer.svelte` component closes out a card's visual structure. It renders a `<div>` that sits at the bottom of a card widget, providing visual separation between body content and trailing actions (e.g. "View details", timestamps, CTAs).

## Purpose and Design Intent

The footer's distinctive muted background (`bg-muted/50`) distinguishes it from the card body, signaling a secondary information zone — consistent with many card design systems where the footer holds low-priority or action content. The `border-t` creates a clean visual divide without requiring the consumer to manage that themselves.

The rounded-bottom treatment (`rounded-b-xl`) mirrors the parent card's outer border-radius, preventing a sharp-cornered footer from breaking the card's polished capsule shape. This is a purely defensive visual pattern: without it, child content could overflow and visually "break" the rounded card container.

## Responsive Sizing via Group Context

The class `group-data-[size=sm]/card:p-3` is a Tailwind group-data variant targeting parent context. The `/card` suffix scopes the group selector so only a direct card ancestor (not any ancestor) triggers the padding reduction. This makes the footer fully responsive to the card's `size` prop without any JS — the card sets `data-size`, the footer reads it through CSS group-data selectors. This CSS-only approach prevents prop-drilling the `size` value down through every sub-component.

## Props and Slot Contract

```svelte
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
```

- **`ref`** — bindable DOM reference so parents can imperatively access the footer element (useful for scroll-anchoring, measurement, or focus management)
- **`className`** — merged via `cn()` allowing full Tailwind override without losing defaults
- **`children`** — Svelte 5 snippet rendered via `{@render children?.()}`, supporting optional children safely
- **`restProps`** — spread on the root `<div>` so ARIA attributes, event handlers, `id`, `style`, etc. all pass through without explicit prop declarations

## `data-slot` Attribute

`data-slot="card-footer"` is a structural selector hook used by the parent `card.svelte`. The card's CSS rule `has-data-[slot=card-footer]:pb-0` detects the presence of a footer child and removes the card's own bottom padding, so the footer's border and padding take full ownership of the bottom edge. Without this hook, the card would have double-padding at the bottom.

## Rendering Behavior

Children are rendered via `{@render children?.()}` — the `?.` guard handles the common case where a footer is included structurally but left empty (e.g. a card template where the footer slot isn't always populated). This prevents a runtime error when `children` is `undefined`.

## Known Gaps

None identified. The component is intentionally minimal — it delegates all state management to the parent card and lets consumers compose their own footer content.
