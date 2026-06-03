---
{
  "title": "RangeBar: Position Marker on a Min-Max Value Track",
  "summary": "RangeBar renders a labeled track with a colored fill and a circular position marker showing where a current value falls within a min-max range — commonly used for 52-week price ranges, analyst target ranges, or any metric with natural bounds. It clamps the marker position defensively and falls back to the midpoint when min equals max.",
  "concepts": [
    "range bar",
    "52-week range",
    "min max current",
    "position marker",
    "division-by-zero guard",
    "clamping",
    "absolute positioning",
    "fill opacity",
    "value track",
    "financial visualization"
  ],
  "categories": [
    "widget",
    "research",
    "data-visualization",
    "finance"
  ],
  "source_docs": [
    "0b13850eccc3ad02"
  ],
  "backlinks": null,
  "word_count": 522,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`RangeBar` visualizes a single current value against a known range. The most common financial use case is the **52-week price range** — showing where a stock's current price sits between its 52-week low and high. But it generalizes to any ranged metric: analyst target spread, volatility band, credit score position, etc.

## Props

```svelte
interface Props {
  label?: string;
  min: number;           // Required
  max: number;           // Required
  current: number;       // Required
  minLabel?: string;     // Formatted min (e.g. "₹1,200")
  maxLabel?: string;     // Formatted max
  currentLabel?: string; // Formatted current value
  color?: string;        // default: 'hsl(var(--primary))'
  class?: string;
}
```

## Position Calculation with Clamping

```svelte
const pct = $derived(
  max > min
    ? Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100))
    : 50
);
```

This single expression contains two defensive behaviors:

**1. Division-by-zero fallback (`max > min ? ... : 50`)**
When `min === max` (degenerate range — can happen when data loads partially or when all analyst targets converge), dividing by `max - min` would produce `Infinity` or `NaN`. The fallback of `50` centers the marker, which is the least misleading position for a collapsed range.

**2. Clamping with `Math.max(0, Math.min(100, ...))`**
If `current` falls outside `[min, max]` — possible when live price data arrives after the range was calculated, or when bounds are stale — the percentage is clamped to `[0, 100]`. Without clamping, the marker and fill div would render partially or entirely outside the track bounds, breaking the component's visual containment.

## Track Architecture

The track uses absolute positioning for both the fill bar and the marker:

```css
.rrb-track {
  position: relative;
  height: 6px;
}
.rrb-fill {
  position: absolute;
  left: 0;
  opacity: 0.25;
}
.rrb-marker {
  position: absolute;
  transform: translate(-50%, -50%);
}
```

The fill is rendered at 25% opacity — it communicates the filled portion without competing with the marker, which is the more precise visual element. The marker uses `transform: translate(-50%, -50%)` to center it on its `left` percentage position, preventing it from being offset to the right of its true position.

## Label Architecture

The bounds row always shows `minLabel ?? min` and `maxLabel ?? max`, meaning if a formatted label is not provided, the raw number is shown as-is. This graceful fallback means the component is functional even before any formatting is applied by the caller.

The current value label only appears when both `label` and `currentLabel` are provided — the header row itself only renders when `label` is set:

```svelte
{#if label}
  <div class="rrb-header">
    ...
    {#if currentLabel}
      <span class="rrb-current">{currentLabel}</span>
    {/if}
  </div>
{/if}
```

This means `currentLabel` without `label` is silently ignored, which is a minor inconsistency.

## Color Customization

The `color` prop defaults to `hsl(var(--primary))`, theming the fill, marker border, and marker dot together. Passing a hardcoded color (e.g. `"#22c55e"` for a price-above-midpoint scenario) lets callers add semantic color meaning.

## Known Gaps

- `currentLabel` is silently ignored if `label` is absent. The label header and current value label are unnecessarily coupled.
- No animation on value changes — the marker would jump rather than slide when `current` updates, which would look abrupt on a live data feed.