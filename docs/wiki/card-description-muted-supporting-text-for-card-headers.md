---
{
  "title": "Card Description — Muted Supporting Text for Card Headers",
  "summary": "CardDescription renders secondary descriptive text beneath a card title using muted foreground color and small type. It uses a semantic `\u003cp\u003e` element to preserve document structure and applies design token classes that adapt to light and dark themes automatically.",
  "concepts": [
    "card description",
    "muted foreground",
    "text-sm",
    "semantic HTML",
    "paragraph element",
    "design tokens",
    "data-slot",
    "dark mode",
    "WithElementRef",
    "Svelte 5"
  ],
  "categories": [
    "widget",
    "card",
    "typography"
  ],
  "source_docs": [
    "28216234c26a7844"
  ],
  "backlinks": null,
  "word_count": 371,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Card headers typically contain a primary title and a shorter supporting description — a subtitle, date range, or context sentence. Without a dedicated component, this text often gets inline styles or ad-hoc color classes, breaking visual consistency and making theme changes difficult.

`card-description.svelte` provides the correct semantic element, correct type scale, and the right design token binding for this pattern.

## Semantic Element Choice

The component renders as a `<p>` tag:

```svelte
<p
  bind:this={ref}
  data-slot="card-description"
  class={cn("text-muted-foreground text-sm", className)}
  {...restProps}
>
  {@render children?.()}
</p>
```

Using `<p>` rather than `<span>` or `<div>` is a deliberate accessibility and document structure choice. The card description is a genuine paragraph of supporting text — semantically it is block-level prose, not inline annotation. Screen readers announce paragraph content differently from span content, and search engine parsers give structural weight to `<p>` elements.

## Design Token Binding

`text-muted-foreground` is a semantic color token rather than a hardcoded value. In Tailwind-based systems, this maps to a CSS custom property (`--color-muted-foreground`) that shifts between values in light and dark themes. Concretely:

- Light mode: a mid-gray (around `#71717a`)
- Dark mode: a lighter gray

Using the token means descriptions automatically correct themselves in dark mode without any per-component override.

`text-sm` (14px in Tailwind's default scale) positions the description one step below the card title in the visual hierarchy, which typically uses `text-base` or `text-lg`.

## Data Slot and CSS Targeting

The `data-slot="card-description"` attribute allows the card header's grid or flex layout to target this element specifically for spacing adjustments, without relying on `nth-child` selectors that break if sub-components are conditionally rendered.

## Props

```typescript
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
```

Note the type is `HTMLAttributes<HTMLParagraphElement>` — not `HTMLDivElement`. This provides accurate TypeScript inference for paragraph-specific attributes (e.g., `align`) and prevents consumers from accidentally passing div-only attributes.

## Usage

```svelte
<CardHeader>
  <CardTitle>Q1 Sales Report</CardTitle>
  <CardDescription>January – March 2026 · 14 regions</CardDescription>
</CardHeader>
```

## Known Gaps

No TODOs or FIXMEs. The component does not truncate long descriptions — a card description that exceeds one line will wrap. Consumers in space-constrained layouts (compact table cards, small widgets) should apply `line-clamp-1` or `truncate` via the `class` prop if single-line descriptions are required.