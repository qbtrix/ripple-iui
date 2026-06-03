---
{
  "title": "Showcase Index — Full Widget Catalog",
  "summary": "The primary showcase page for the Ripple widget library, rendering every core widget type through inline pocket specs that are fed to the Ripple component, serving as both a visual regression reference and a live usage guide.",
  "concepts": [
    "widget catalog",
    "showcase",
    "layout widgets",
    "display widgets",
    "pocket spec",
    "Ripple component",
    "RippleEvent",
    "tabs",
    "grid",
    "flex",
    "badge",
    "chart types",
    "visual regression"
  ],
  "categories": [
    "showcase",
    "widget",
    "demo"
  ],
  "source_docs": [
    "17feb19416696165"
  ],
  "backlinks": null,
  "word_count": 373,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/+page.svelte` is the comprehensive widget catalog for Ripple. Rather than documenting widgets in static markdown, every widget is rendered live through the `Ripple` component using pocket specs authored inline. This means the showcase is always in sync with the actual runtime — if a widget regresses, the showcase breaks visibly.

## Structure

The page is organized into two families, each with multiple specs:

### Layout Widgets

- **Container** — wraps content with padding and background, the base positioning primitive
- **Flex** — row/column flex layout with `gap`, `align`, and `justify` props
- **Grid** — CSS grid with configurable `columns` and `gap`
- **Card** — bordered content box with `title`, `description`, and variant support (`default`, `selected`, `muted`)
- **Tabs** — tabbed panel where each child maps to one tab

### Display Widgets

- **Text** — six size tiers (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`) with optional `weight`
- **Heading** — H1–H4 semantic headings
- **Badge** — inline label with `default`, `secondary`, `outline`, `success`, `destructive` variants
- **Image** — responsive image with `fit` (cover/contain) and `rounded` props
- **Separator** — horizontal rule
- **Stat** — metric display with delta and directional coloring
- **Chart** — sparkline, area, bar, line, donut, and candlestick chart types
- **Table** — data table with variant and column config
- **Progress** — percentage bar
- **Avatar** — initials or image avatar with size variants

## Why Inline Specs?

Every spec object is a plain `{ version, ui }` structure. This approach:

1. Proves the Ripple spec format works end-to-end without custom Svelte components.
2. Lets developers copy a spec snippet directly into their own integration.
3. Makes the showcase runnable offline without any API dependency.

## Event Wiring

```typescript
function handleEvent(event: RippleEvent) {
  console.log('RippleEvent:', event);
}
```

Interactive widgets (buttons, inputs, follow-up fields) emit `RippleEvent` objects. The showcase logs them, making it easy to inspect event shapes during development without a real host implementation.

## Known Gaps

The showcase renders widgets in isolation. Composite patterns — for example, a button inside a card inside a tab panel — are not covered here; those patterns appear in the individual widget showcase routes (`/showcase/button`, `/showcase/card`). There is no visual diff tooling wired to the showcase, so regressions require manual inspection.