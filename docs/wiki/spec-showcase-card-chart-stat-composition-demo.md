---
{
  "title": "Spec Showcase — Card + Chart + Stat Composition Demo",
  "summary": "A showcase page that renders four analytics dashboard cards (revenue, latency, signups, error share) using the Ripple spec format, demonstrating how Chart, Stat, and Card compose together with slot injection to build production-style metric panels.",
  "concepts": [
    "metric card",
    "Chart widget",
    "Stat widget",
    "Card composition",
    "slot injection",
    "area chart",
    "line chart",
    "bar chart",
    "donut chart",
    "down-good direction",
    "delta percent",
    "synthetic data",
    "dashboard"
  ],
  "categories": [
    "showcase",
    "widget",
    "data-visualization"
  ],
  "source_docs": [
    "809751e4c1112fbc"
  ],
  "backlinks": null,
  "word_count": 387,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/spec/+page.svelte` demonstrates the most common real-world Ripple composition pattern: a `card` with a `stat` in its header slot and a `chart` as the main body. This is the canonical "metric card" pattern used in dashboards, and this page exists to verify it renders correctly across multiple chart types.

## Four Card Specs

### Revenue Card
A 30-day area chart with a rising trend, showing currency-formatted revenue (`$12,450.32`) with a `+3.4%` delta badge:

```javascript
const revenueSeries = Array.from({ length: 30 }, (_, i) => ({
  label: `Day ${i + 1}`,
  value: 8000 + Math.round(Math.sin(i / 5) * 800 + i * 140 + Math.random() * 400),
}));
```

The sinusoidal variation with linear trend creates visually convincing demo data without hard-coding 30 values.

### Latency Card
A 24-hour line chart for p95 latency (`187ms`) with a `+12.4%` delta using `direction: 'down-good'`. The `down-good` direction signals that lower values are better — the delta badge renders red even though the value went up, correctly reflecting that latency increasing is bad.

### Signups Card
A 7-day bar chart with weekly signup counts. Uses `tooltip: true` to verify interactive tooltips work on bar charts.

### Error Share Card
A donut chart breaking down HTTP response mix (5xx, 4xx, timeout, OK). Tests the donut chart type and multi-segment labeling.

## Composition Pattern

All four specs follow the same structure:

```javascript
{
  ui: {
    type: 'card',
    props: { title: '...', description: '...' },
    children: [
      { type: 'stat', slot: 'header', props: { value, format, deltaPercent, direction, size: 'sm', align: 'right' } },
      { type: 'chart', props: { type, data, height, tooltip } },
      { type: 'text', slot: 'footer', props: { text: 'Updated 2m ago' } }  // optional
    ]
  }
}
```

The `slot: 'header'` and `slot: 'footer'` fields route child widgets into the Card's named snippet slots rather than the default body slot — a key mechanism for extending layout without custom components.

## Why Synthetic Data?

The series arrays are computed programmatically. This ensures the charts always have clean, non-trivial data without network calls, and the sinusoidal/linear formulas produce visually distinct shapes that expose rendering edge cases (sharp peaks, long flat segments).

## Known Gaps

The page does not test empty data states — charts receiving `[]` data. It also does not verify responsive behavior at narrow viewport widths.