---
{
  "title": "Chart Utils — Config Types, Context Management, and Payload Resolution",
  "summary": "This utility module defines the `ChartConfig` type and the Svelte context pair (`setChartContext` / `useChart`) that share chart configuration across the component tree. It also exports `getPayloadConfigFromPayload`, a defensive resolver that extracts per-series config from LayerChart's polymorphic tooltip payload.",
  "concepts": [
    "ChartConfig",
    "ChartContext",
    "getPayloadConfigFromPayload",
    "TooltipPayload",
    "Symbol context key",
    "discriminated union",
    "type derivation",
    "ComponentProps",
    "setContext",
    "getContext"
  ],
  "categories": [
    "chart",
    "state-management",
    "utilities"
  ],
  "source_docs": [
    "d6a654c1b4b13ba1"
  ],
  "backlinks": null,
  "word_count": 483,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`chart-utils.ts` is the shared foundation for all chart components. It defines the type contracts, establishes the context communication channel between `ChartContainer` and its children, and provides the key utility function that links runtime tooltip data to static chart configuration.

## ChartConfig Type

```typescript
export type ChartConfig = {
  [k in string]: {
    label?: string;
    icon?: Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};
```

The discriminated union on `color` vs `theme` enforces mutual exclusivity: a series config can have a flat color string OR a theme-keyed color map, but never both. Without this constraint, ChartStyle's priority logic (which prefers `theme` over `color`) would silently discard values in an order consumers might not expect.

## TooltipPayload Type Derivation

```typescript
export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never;

export type TooltipPayload = ExtractSnippetParams<
  ComponentProps<typeof Tooltip.Root>["children"]
>["payload"][number];
```

Rather than manually typing the LayerChart payload shape, this derives the type directly from LayerChart's own `Tooltip.Root` component props. This is a defensive typing strategy: if LayerChart updates its payload structure, `TooltipPayload` automatically reflects the change at compile time rather than silently drifting.

## getPayloadConfigFromPayload

This function bridges runtime tooltip payload (which has varying key naming conventions) to the static `ChartConfig`. It tries multiple key resolution strategies in order:

1. `payload.key === key` — direct key match
2. `payload.name === key` — name field match
3. `payload[key]` is a string — the key value itself is the config key
4. `payload.payload[key]` is a string — the nested payload holds the config key

This cascade exists because LayerChart serializes different chart types (line, bar, area, pie) with different payload shapes. A pie series uses `name` where a line series uses `key`. Without this multi-strategy resolution, tooltips would silently fail to display labels or colors for certain chart types.

The null/undefined guard at the top (`if (typeof payload !== "object" || payload === null)`) prevents runtime crashes when the tooltip fires before data is loaded.

## Context Pattern

```typescript
const chartContextKey = Symbol("chart-context");

export function setChartContext(value: ChartContextValue) {
  return setContext(chartContextKey, value);
}

export function useChart() {
  return getContext<ChartContextValue>(chartContextKey);
}
```

Using a `Symbol` as the context key (rather than a string) prevents accidental key collision with other libraries or user code that might also store context under `"chart-context"`. The symbol is module-private, so only components importing from this module can participate in the context.

`useChart()` returns `ChartContextValue` without a fallback undefined check — calling it outside a `ChartContainer` will return `undefined` at runtime. This is intentional: it fails loudly rather than silently, making misconfigured usage detectable.

## Known Gaps

`useChart()` does not throw a descriptive error when called outside context — it returns `undefined`, which will cause a property access error downstream. A guard like `if (!ctx) throw new Error("useChart must be called inside ChartContainer")` would improve developer experience.
