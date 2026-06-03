---
{
  "title": "Stat Metric Widget with Delta and Direction",
  "summary": "A data metric widget for dashboards that renders a labeled numeric value with optional change indicator (delta chip). Handles locale-aware number formatting across four modes — number, currency, percent, and compact — and supports a sophisticated direction/sentiment system that decouples visual arrow direction from color meaning.",
  "concepts": [
    "stat widget",
    "KPI",
    "metric display",
    "delta chip",
    "direction sentiment",
    "Intl.NumberFormat",
    "locale formatting",
    "tailwind-variants",
    "data attributes",
    "down-good pattern"
  ],
  "categories": [
    "widget",
    "display",
    "data-visualization",
    "analytics"
  ],
  "source_docs": [
    "1c9e21d9a291ac35"
  ],
  "backlinks": null,
  "word_count": 569,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Stat.svelte` is Ripple's primary metric display widget. It is designed for KPI cards, financial dashboards, and analytics panels where numbers need to communicate not just their current value but their recent trend. The component handles the surprisingly complex space of "what does up or down mean" for a given metric.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| string` | required | The main metric value |
| `label` | `string` | — | Descriptive label above the value |
| `format` | `'number' \| 'currency' \| 'percent' \| 'compact'` | `'number'` | Formatting mode |
| `currency` | `string` | `'USD'` | Currency code for format=currency |
| `locale` | `string` | — | BCP 47 locale tag |
| `precision` | `number` | — | Decimal precision override |
| `delta` | `number` | — | Absolute change value |
| `deltaPercent` | `number` | — | Percentage change |
| `deltaFormat` | `'absolute' \| 'percent' \| 'both'` | `'percent'` | What to show in the delta chip |
| `direction` | `DirectionInput` | `'auto'` | Arrow and sentiment logic |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `align` | `'left' \| 'right'` | `'left'` | Text alignment |

## Number Formatting

All numeric formatting goes through `Intl.NumberFormat`, which respects the `locale` prop. Passing `locale` enables correct thousands separators, decimal characters, and currency symbols for international users without shipping a custom formatting library.

```typescript
return new Intl.NumberFormat(locale, opts).format(v);
```

String values bypass formatting entirely, allowing pre-formatted strings like `"$12,450"` to pass through unchanged — important when the data source returns a pre-localized string that should not be reformatted.

## The Direction/Sentiment System

This is the most nuanced part of the component. The `direction` prop accepts five modes:

- **`auto`** — arrow and color both derive from the sign of the delta
- **`up` / `down` / `neutral`** — explicit arrow override
- **`up-good`** — up is green (profits), down is red
- **`down-good`** — down is green (error rates, latency), up is red

The `down-good` mode solves a real UX problem: for metrics like "defect count" or "page load time", a decrease is positive. Without this mode, a -20% change would render in red (because the delta is negative), which is exactly wrong.

```typescript
// down-good: up = bad, down = good
if (referenceDelta > 0) return { dir: 'up', sentiment: 'negative' };
if (referenceDelta < 0) return { dir: 'down', sentiment: 'positive' };
```

## Delta Chip Rendering

The delta chip is conditionally rendered only when `delta` or `deltaPercent` is provided. This prevents an empty chip space from appearing on metrics that do not track change. The chip uses `data-slot="stat-delta"` for test targeting without relying on class names.

## Styling Architecture

The component uses `tailwind-variants` (`tv()`) for variant composition across size and alignment axes. Data attributes (`data-size`, `data-direction`, `data-sentiment`) are placed on the root element to expose machine-readable state for tests, parent CSS selectors, and external tooling without requiring class parsing.

## Known Gaps

- No `loading` or skeleton state — the component renders `undefined` values as `"undefined"` strings if the parent hasn't guarded against unloaded data.
- `deltaFormat: 'both'` requires both `delta` and `deltaPercent` to be provided to show both halves; if only one is present it silently falls back to that one with no warning.