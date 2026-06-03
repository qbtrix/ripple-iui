---
{
  "title": "Card Content — Main Body Region with Size-Responsive Padding",
  "summary": "CardContent is the main body slot of a card, providing horizontal padding that tightens automatically when the parent card is in its small size variant. It enforces consistent internal spacing without requiring consumers to manage padding manually.",
  "concepts": [
    "card content",
    "responsive padding",
    "group data attributes",
    "data-slot",
    "card body",
    "group context",
    "size variant",
    "WithElementRef",
    "Svelte 5 runes",
    "full-bleed"
  ],
  "categories": [
    "widget",
    "card",
    "layout"
  ],
  "source_docs": [
    "c99c6af2bd0df2c2"
  ],
  "backlinks": null,
  "word_count": 323,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Card body content — text, tables, charts, form fields — needs consistent horizontal padding to prevent it from visually colliding with the card border. Without a shared content container, every card implementation ends up with ad-hoc padding classes, leading to inconsistency across the app.

`card-content.svelte` provides a single wrapper that applies the correct padding and automatically adapts to the card's size context.

## Size-Responsive Padding

The single most notable behavior is the responsive padding:

```svelte
<div
  data-slot="card-content"
  class={cn("px-4 group-data-[size=sm]/card:px-3", className)}
>
```

- Default: `px-4` (16px horizontal padding)
- Small card: `group-data-[size=sm]/card:px-3` (12px when parent card has `data-size="sm"`)

The `group-data-[size=sm]/card` selector reads the `data-size="sm"` attribute on the nearest ancestor with the `group/card` CSS group class (applied by the Card root). This means content automatically tightens without any prop needed on `CardContent` itself.

## Slot Identity

The `data-slot="card-content"` attribute serves two purposes:

1. **CSS targeting** — parent card styles can apply rules specifically to the content region without class collisions
2. **Runtime introspection** — Ripple's generative UI runtime uses `data-slot` to identify component regions when assembling dynamic card layouts

## Props

```typescript
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
```

Full `HTMLAttributes<HTMLDivElement>` pass-through means consumers can apply event listeners, ARIA roles, or custom data attributes.

## Rendering Behavior

The component is a transparent wrapper — it applies padding and slot identity, then renders its children unchanged via `{@render children?.()}`. It does not manage overflow, scroll, or background — those concerns belong to the Card root or specific content types.

## Usage Example

```svelte
<Card>
  <CardHeader>
    <CardTitle>Monthly Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <RevenueChart data={chartData} />
  </CardContent>
</Card>
```

## Known Gaps

The component only adjusts horizontal padding (`px-*`), not vertical padding. Vertical spacing between card sections is handled elsewhere (likely via `CardHeader` margin or `CardFooter` padding). Consumers who need to remove horizontal padding entirely for full-bleed content (e.g., an image that spans the card width) must override with `class="px-0"`.