---
{
  "title": "Chart Tooltip — Rich Data Series Overlay with Configurable Indicators",
  "summary": "ChartTooltip is a styled hover overlay for chart widgets that reads active data series from LayerChart's tooltip context, resolves each series label and color from `ChartConfig`, and renders rows with configurable indicator shapes (dot, line, or dashed). It supports custom formatters via Svelte snippets.",
  "concepts": [
    "chart-tooltip",
    "LayerChart tooltip context",
    "TooltipPayload",
    "indicator variants",
    "label resolution",
    "formatter snippet",
    "useChart",
    "getTooltipContext",
    "toLocaleString",
    "nestLabel"
  ],
  "categories": [
    "chart",
    "widget",
    "data-visualization"
  ],
  "source_docs": [
    "747e32f77e90f674"
  ],
  "backlinks": null,
  "word_count": 442,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`chart-tooltip.svelte` bridges LayerChart's internal hover state with ripple's design system. It renders a floating data summary card when hovering over chart data points, displaying series names, values, and colored indicators.

## Data Flow

```svelte
const chart = useChart();          // ChartConfig from context
const tooltipCtx = getTooltipContext();  // Active hover payload from LayerChart
```

The component consumes two separate contexts:
1. **`useChart()`** — returns the `ChartConfig` that maps series keys to labels, colors, and icons
2. **`getTooltipContext()`** — returns LayerChart's reactive tooltip payload (active data points)

This split allows the config (static per chart) and the payload (dynamic on hover) to be managed independently.

## Label Resolution

```svelte
const formattedLabel = $derived.by(() => {
  const key = labelKey ?? item?.label ?? item?.name ?? "value";
  const itemConfig = getPayloadConfigFromPayload(chart.config, item, key);
  const value = !labelKey && typeof label === "string"
    ? (chart.config[label]?.label ?? label)
    : (itemConfig?.label ?? item.label);
  ...
});
```

Label resolution uses a priority chain: explicit `labelKey` prop > payload's own `label` > payload's `name` > fallback `"value"`. This defensive chain ensures the tooltip shows meaningful text even when chart data doesn't have uniform key naming.

## Indicator Variants

Each data row shows a colored indicator whose shape is controlled by the `indicator` prop:

- **`"dot"`** — a small rounded square (`size-2.5`), items aligned center
- **`"line"`** — a tall thin bar (`h-full w-1`), representing a vertical line series
- **`"dashed"`** — a zero-width element with dashed border, visually a dashed rule

The `nestLabel` derived value (`payload.length === 1 && indicator !== "dot"`) handles a layout edge case: when there's only one series and using a line/dashed indicator, the label is rendered inside the row rather than above it, because stacking an isolated label above a single row looks imbalanced.

## Custom Formatter Snippet

```svelte
formatter?: Snippet<[{ value, name, item, index, payload }]>;
```

Consumers can pass a `formatter` snippet to fully replace the default row rendering. This supports use cases like percentages, custom units, or sparklines within tooltip rows. The formatter only renders when `item.value !== undefined && item.name` — preventing empty snippet invocations for null data points.

## Value Display

```svelte
{item.value.toLocaleString()}
```

`toLocaleString()` formats numbers with locale-appropriate thousands separators — e.g. `1000000` becomes `1,000,000` in en-US locales. This is a UX defensive measure preventing raw unformatted numbers in the tooltip.

## Known Gaps

- The `labelFormatter` return type allows `string | number | Snippet`, but the template only handles `typeof formattedLabel === "function"` for snippets — it assumes non-function values are strings without explicit number-to-string coercion.
- `defaultFormatter` casts any value to string via template literal, which may not handle `null` or `undefined` gracefully in edge cases.
