---
{
  "title": "Card Title — Size-Aware Heading Text for Card Components",
  "summary": "CardTitle renders the primary heading within a card header. It is a thin styled wrapper that responds to the parent card's size variant, reducing text size from `text-base` to `text-sm` when the card is in compact mode.",
  "concepts": [
    "card-title",
    "typography",
    "group-data variants",
    "data-slot",
    "Svelte 5 snippets",
    "WithElementRef",
    "cn utility",
    "card hierarchy",
    "Tailwind CSS",
    "semantic HTML"
  ],
  "categories": [
    "widget",
    "typography",
    "card"
  ],
  "source_docs": [
    "bc63945a544ee1ab"
  ],
  "backlinks": null,
  "word_count": 377,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`card-title.svelte` provides the primary label or heading for a card component. Its implementation is intentionally minimal — a single styled `<div>` — but the class choices reflect deliberate decisions about typography, hierarchy, and responsive behavior.

## Why a `<div>` Not a Heading Tag

Using a `<div>` instead of `<h2>` or `<h3>` avoids imposing heading hierarchy on consumers. Cards can appear at any nesting level in the document, and hardcoding `<h2>` would break the logical heading outline when cards are nested or used in dashboards with their own heading structure. Consumers who need proper heading semantics can pass an `as` prop alternative or wrap the slot content with the appropriate heading element. This pattern trades strict semantic defaults for flexibility.

## Typography and Sizing

```
text-base leading-snug font-medium
group-data-[size=sm]/card:text-sm
```

- `text-base` with `leading-snug` provides a compact but readable default — tighter than the browser's default line height for headings, important in dense card layouts where vertical space is at a premium.
- `font-medium` (500 weight) signals heading status without the visual aggression of `font-semibold` or `font-bold` — appropriate for UI labels in card contexts.
- `group-data-[size=sm]/card:text-sm` scales down when the parent card is in compact mode. Without this, a `size=sm` card would reduce its padding and gaps but keep full-size title text — creating a disproportionate visual weight.

## Props

```svelte
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
```

Standard ripple sub-component contract:
- **`ref`** — bindable for imperative DOM access
- **`className`** — merged via `cn()`, allowing consumers to override typography (e.g. `text-lg font-bold` for a prominent hero card)
- **`children`** — optional snippet; safe to leave empty in templates
- **`restProps`** — passes `id`, `aria-*`, `data-*`, click handlers, etc. to the root element

## `data-slot` as Structural Identifier

`data-slot="card-title"` marks this element for potential parent-level CSS targeting. While the current card CSS does not specifically query for `card-title` presence (unlike `card-action` and `card-description` in the header), the attribute follows the consistent slot-identification pattern across all card sub-components and enables future layout adaptations without source changes.

## Known Gaps

No semantic heading element is rendered by default. Consumers building accessible pages must ensure proper document outline either by replacing the wrapper or by auditing card usage in context.
