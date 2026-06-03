---
{
  "title": "Chart Component Index — Public API Barrel for Chart System",
  "summary": "The chart `index.ts` barrel exports `ChartContainer` and `ChartTooltip` as the public surface of the chart system, alongside `ChartConfig` type and `getPayloadConfigFromPayload` utility for consumer-level payload handling.",
  "concepts": [
    "chart barrel",
    "ChartContainer",
    "ChartTooltip",
    "ChartConfig",
    "getPayloadConfigFromPayload",
    "dual-name exports",
    "encapsulation",
    "namespace import",
    "$lib alias",
    "public API surface"
  ],
  "categories": [
    "chart",
    "module-system",
    "data-visualization"
  ],
  "source_docs": [
    "4321738bd45fe5b5"
  ],
  "backlinks": null,
  "word_count": 307,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`chart/index.ts` is the single import point for all chart-related components and utilities. It deliberately exposes a minimal, curated API rather than re-exporting every internal module.

## Exported Surface

```typescript
import ChartContainer from "./chart-container.svelte";
import ChartTooltip from "./chart-tooltip.svelte";

export { getPayloadConfigFromPayload, type ChartConfig } from "./chart-utils.js";
export { ChartContainer, ChartTooltip, ChartContainer as Container, ChartTooltip as Tooltip };
```

Four things are exported:

1. **`ChartContainer`** / **`Container`** — the required root wrapper
2. **`ChartTooltip`** / **`Tooltip`** — the hover overlay component
3. **`ChartConfig`** — the type consumers need to define their series configuration
4. **`getPayloadConfigFromPayload`** — for consumers building custom tooltip formatters who need to resolve their own series config from payload data

## What Is Not Exported

- `ChartStyle` — an implementation detail of `ChartContainer`; consumers never instantiate it directly
- `setChartContext` / `useChart` — internal context functions; only exported for intra-library use via `chart-utils.js`
- `THEMES` — internal constant, not needed externally

This omission is intentional encapsulation. Leaking internal primitives creates maintenance burden — if they were public, any refactor of the context system would become a breaking API change.

## Dual-Name Exports

Like the card system, chart components are exported under both full names (`ChartContainer`, `ChartTooltip`) and short names (`Container`, `Tooltip`). This supports namespace-style usage:

```typescript
import * as Chart from "$lib/components/ui/chart";
// <Chart.Container config={...}>
//   <Chart.Tooltip />
// </Chart.Container>
```

And destructured usage:

```typescript
import { ChartContainer, ChartTooltip, type ChartConfig } from "$lib/components/ui/chart";
```

## Re-exporting Types

The `type ChartConfig` re-export makes it available alongside the components without a separate import from `chart-utils`. Consumers configure their chart data using this type and pass the result as the `config` prop to `ChartContainer`.

## Known Gaps

There is no default export or namespace-style `Chart` object export. Consumers who prefer `Chart.Container` must use `import * as Chart from ...` syntax rather than `import Chart from ...`.
