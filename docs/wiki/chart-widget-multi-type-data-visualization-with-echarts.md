---
{
  "title": "Chart Widget — Multi-Type Data Visualization with ECharts",
  "summary": "A single-component wrapper around Apache ECharts that supports ten chart types — bar, line, area, pie, donut, candlestick, sparkline, heatmap, gauge, and radar — all within a consistent theme-aware, resize-reactive API. The component lazy-loads ECharts on mount, adapts colors to the active CSS theme, and accepts deep-merge overrides for advanced customization.",
  "concepts": [
    "ECharts",
    "data visualization",
    "chart types",
    "candlestick",
    "sparkline",
    "heatmap",
    "ResizeObserver",
    "theme-aware colors",
    "deepMerge",
    "themeOverrides",
    "lazy import",
    "bar chart",
    "radar chart",
    "gauge"
  ],
  "categories": [
    "widget",
    "data",
    "visualization"
  ],
  "source_docs": [
    "b543befda605ef80"
  ],
  "backlinks": null,
  "word_count": 625,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple-generated UIs frequently need to visualize data alongside text and actions — metrics dashboards, financial summaries, analytics panels. Rather than requiring separate chart libraries per type, the Chart widget encapsulates the full range of common chart geometries behind a uniform prop interface. Spec authors declare `type="bar"` or `type="candlestick"` without knowing anything about ECharts' option schema.

## Supported Chart Types

| Type | Use Case |
|------|----------|
| `bar` | Categorical comparisons, ranked lists |
| `line` | Trends over time |
| `area` | Trends with cumulative emphasis |
| `pie` | Part-to-whole proportions |
| `donut` | Part-to-whole with center space for a KPI |
| `candlestick` | OHLC financial data |
| `sparkline` | Compact inline trend indicators |
| `heatmap` | Density across two categorical axes |
| `gauge` | Single percentage-of-maximum value |
| `radar` | Multi-dimensional attribute comparison |

## Data Format

All types consume a `DataPoint[]` array with a common shape:

```typescript
interface DataPoint {
  label: string;    // x-axis or legend label
  value: number;    // primary value
  open?: number;    // candlestick OHLC
  close?: number;
  high?: number;
  low?: number;
  [key: string]: unknown;  // type-specific extras (e.g. heat for heatmap)
}
```

Types that don't use all fields (e.g., bar only needs `label` + `value`) simply ignore the rest. Candlestick falls back to `value` for any missing OHLC field, preventing crashes on sparse data.

## Theme-Aware Colors

The `themeColors()` function reads the computed `color` CSS property on the chart element at render time:

```typescript
const s = getComputedStyle(chartEl);
const fg = s.getPropertyValue('color').trim();
```

This anchors all axis labels, grid lines, and title text to the active CSS theme rather than hardcoded values. The `applyAlpha()` helper converts the resolved color (in any format — rgb(), hex, oklch) to `rgba()` with a specified opacity, enabling consistent muted/grid line tones.

The canvas-based fallback in `applyAlpha()` handles modern color spaces (oklch, color()) that cannot be parsed with regex by drawing a 1×1 pixel and reading back the computed RGB.

## Resize Handling

A `ResizeObserver` watches the chart container. When dimensions change (initial mount or container resize), it calls `initChart()` for the first render or `chart.resize()` for subsequent resizes. A `window.resize` listener provides a secondary signal for full-page reflows. Both are cleaned up in the `onMount` return function to prevent memory leaks.

The ResizeObserver guards against zero-size renders (`if (width > 0 && h > 0)`) — a real failure mode when containers are hidden or transitioning.

## Theme Override System

The `themeOverrides` prop accepts an arbitrary ECharts option object that is deep-merged onto the generated option after all type-specific logic runs. This allows fine-grained customization (e.g., changing axis label font size, adding a custom legend position) without forking the component.

The `deepMerge()` utility handles nested objects correctly, recursing into object values rather than replacing them wholesale — unlike `Object.assign` which would clobber an entire nested config object.

## Reactive Re-Render

```svelte
$effect(() => {
  if (chart && data && type) {
    chart.setOption(buildOption(), true);
  }
});
```

The `true` flag passed to `setOption` instructs ECharts to replace the entire option rather than merge with the existing state — preventing stale series data from bleeding through on type switches.

## Known Gaps

- **Heatmap data model is unusual**: The heatmap interprets `data[i].value` as the Y-category label string (stringified) rather than the heat intensity. Heat intensity must be provided as a `heat` extra field. This is a non-obvious API that could produce incorrect visualizations if callers pass numeric values expecting them to be plotted as intensity.
- **No loading or empty-state slot**: The `chartSlot` snippet allows full override but there is no built-in empty/loading state.
- **ECharts is always initialized with `canvas` renderer**: SVG renderer is not configurable, which may matter for print or accessibility scenarios.