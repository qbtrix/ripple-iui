---
{
  "title": "Chart Container — LayerChart Integration Host with CSS Override Layer",
  "summary": "ChartContainer is the root wrapper for all chart widgets. It establishes chart context, generates a unique scoped chart ID, injects theme-based CSS variables, and applies a comprehensive set of Tailwind overrides that normalize LayerChart's default visual behavior.",
  "concepts": [
    "chart-container",
    "LayerChart",
    "CSS overrides",
    "chart context",
    "data-chart selector",
    "ChartStyle",
    "$props.id()",
    "CSS variable scoping",
    "Svelte context",
    "Tailwind arbitrary selectors"
  ],
  "categories": [
    "widget",
    "chart",
    "data-visualization"
  ],
  "source_docs": [
    "faab250e04af47c1"
  ],
  "backlinks": null,
  "word_count": 440,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`chart-container.svelte` is the mandatory outer wrapper for all chart components. It does three distinct jobs: provides Svelte context for chart configuration, generates a unique DOM-scoped identifier for CSS targeting, and overrides LayerChart's default styles to match ripple's design system.

## Unique Chart ID Generation

```svelte
const uid = $props.id();
const chartId = `chart-${id || uid.replace(/:/g, "")}`;
```

`$props.id()` generates a component-instance-unique identifier using Svelte 5's built-in ID generation. The `replace(/:/g, "")` strips colons because `[data-chart=chart-abc:123]` would be an invalid CSS attribute selector — colons are not allowed unescaped in attribute selector values. This is a defensive sanitization step preventing broken CSS selectors when the generated ID happens to contain colons (which Svelte's internal IDs can include).

The `chartId` is written to the DOM as `data-chart={chartId}`, scoping all the CSS variable injections in `ChartStyle` to exactly this container instance. Multiple charts on the same page won't share or corrupt each other's color variables.

## Chart Context

```svelte
setChartContext({
  get config() { return config; }
});
```

The `get config()` accessor (rather than a plain value) ensures the context always reflects the current reactive `config` prop. If `config` were captured as a plain value at setup time, changing the config prop later wouldn't propagate to child components reading context. The getter makes the context value live.

## LayerChart Style Normalization

The container applies an extensive list of CSS overrides via Tailwind arbitrary-property selectors. Each override addresses a specific LayerChart default that conflicts with ripple's design:

- `[&_.lc-highlight-point]:stroke-transparent` — Removes the visible stroke ring around data points on hover, which in LayerChart's default theme appears as a contrasting ring.
- `[&_.lc-highlight-line]:stroke-0` — Hides the vertical crosshair line that appears when hovering, replaced by the tooltip alone.
- `[&_.lc-area-path]:opacity-100` / `[&_.lc-spline-path]:opacity-100` — Prevents opacity reduction on non-hovered series in stacked charts. LayerChart dims sibling series on hover to highlight the active one; this override keeps all series at full opacity for a cleaner look.
- `[&_.lc-axis-tick]:stroke-0` — Removes tick marks between axis labels and the chart body.
- `[&_.lc-rule-x-line:not(.lc-grid-x-rule)]:stroke-0` — Hides the axis baseline rule that would otherwise overlap grid lines.
- `[&_.lc-legend-swatch]:size-2.5 [&_.lc-legend-swatch]:rounded-[2px]` — Normalizes legend color swatches to a compact, slightly-rounded square.

## Props

```svelte
let {
  ref = $bindable(null),
  id = uid,
  class: className,
  children,
  config,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLElement>> & { config: ChartConfig } = $props();
```

`config` is required (no default) — every chart must declare its data series configuration. This is enforced at the TypeScript type level.

## Known Gaps

The `aspect-video` default aspect ratio (16:9) may not suit all chart contexts (e.g. compact sparklines). Consumers must override with a custom class; there is no `aspect` prop.
