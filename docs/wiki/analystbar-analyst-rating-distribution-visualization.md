---
{
  "title": "AnalystBar: Analyst Rating Distribution Visualization",
  "summary": "AnalystBar renders a proportional color-segmented bar showing the breakdown of analyst ratings (Buy, Hold, Sell) for a financial instrument, along with consensus label and target price. It uses Svelte 5 `$derived` reactivity to compute segment widths from raw counts, gracefully handling the zero-total edge case.",
  "concepts": [
    "analyst ratings",
    "buy hold sell",
    "proportional bar",
    "financial widget",
    "Svelte 5 runes",
    "$derived",
    "zero-division guard",
    "consensus label",
    "target price",
    "sentiment visualization"
  ],
  "categories": [
    "widget",
    "research",
    "data-visualization",
    "finance"
  ],
  "source_docs": [
    "48249b5e2bb95361"
  ],
  "backlinks": null,
  "word_count": 505,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`AnalystBar` is a research widget for displaying sell-side analyst consensus data. In financial UIs, raw counts of Buy/Hold/Sell ratings are only meaningful when visualized proportionally — seeing "12 Buy, 3 Hold, 2 Sell" as a bar immediately communicates sentiment strength that raw numbers obscure. This widget exists to bridge that gap.

## Props

```svelte
interface Props {
  buy?: number;        // Buy/Overweight count
  hold?: number;       // Hold count
  sell?: number;       // Sell/Underweight count
  consensus?: string;  // e.g. "Overweight", "Buy"
  target?: string;     // Average target price
  class?: string;
}
```

All rating counts default to `0`, so the component renders safely with partial data — only the segments that have a non-zero percentage are mounted in the DOM.

## Data Flow and Reactivity

The component uses Svelte 5 runes for derived state:

```svelte
const total = $derived(buy + hold + sell);
const buyPct  = $derived(total ? (buy  / total * 100) : 0);
const holdPct = $derived(total ? (hold / total * 100) : 0);
const sellPct = $derived(total ? (sell / total * 100) : 0);
```

The `total ? ... : 0` guard prevents a division-by-zero when all counts are zero (which happens when data hasn't loaded yet or when a fresh widget is mounted with no props). Without it, all three segments would produce `NaN` width values, breaking CSS layout.

## Rendering Behavior

The segmented bar uses inline `style="width:{pct}%"` with `{#if pct > 0}` guards. This means zero-count segments are completely absent from the DOM rather than rendering as `width:0` divs. The practical benefit: the `border-radius` on segments looks correct regardless of which combination of ratings are present. A `width:0` div with `border-radius: 4px` would create invisible rendering artifacts.

The `min-width: 4px` CSS rule ensures a segment is always at least visible if it exists — preventing a scenario where a very small percentage (e.g. 1%) renders as a hairline that looks like a rendering glitch.

Segments also have a `transition: width 0.3s ease` for smooth animation when rating data updates live (e.g. on a real-time dashboard).

## Color Semantics

The component uses hardcoded semantic colors rather than CSS variables:
- Buy: `#22c55e` (green)
- Hold: `#f59e0b` (amber)
- Sell: `#ef4444` (red)

This is intentional — these are universal financial UI conventions that should not be overridden by themes. The legend dots use the same hardcoded values to keep visual correspondence exact.

## Header Conditional Rendering

The consensus label and target price block only render when at least one of those props is provided:

```svelte
{#if consensus || target}
  <div class="rab-header">...</div>
{/if}
```

This avoids an empty header row when the component is used purely as a bar without metadata context.

## Known Gaps

- No animated transition when the component first mounts — only subsequent updates animate via the CSS `transition`. An entry animation would make data loading feel more polished.
- The `target` prop accepts a pre-formatted string (e.g. `"₹2,450"`) rather than a raw number plus currency, meaning number formatting is the caller's responsibility. There is no built-in locale-aware formatting.