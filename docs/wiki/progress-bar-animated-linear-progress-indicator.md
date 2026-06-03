---
{
  "title": "Progress Bar — Animated Linear Progress Indicator",
  "summary": "A styled wrapper around bits-ui's `Progress.Root` that renders a horizontal progress bar with a CSS transform-based fill animation. It accepts `value` (current progress) and `max` (ceiling, default 100) props, renders an inner indicator div styled as the primary color, and uses `translateX` rather than `width` changes to animate smoothly.",
  "concepts": [
    "progress bar",
    "translateX animation",
    "GPU compositing",
    "indeterminate state",
    "bits-ui Progress",
    "WithoutChildrenOrChild",
    "value/max props",
    "overflow-x-hidden",
    "transition-all",
    "ARIA progressbar"
  ],
  "categories": [
    "widget",
    "feedback",
    "animation"
  ],
  "source_docs": [
    "c1f31a1fe2ac86d5"
  ],
  "backlinks": null,
  "word_count": 424,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`progress.svelte` is Ripple's progress bar widget. It renders a horizontal track with a filled indicator that visually represents a ratio — `value / max`. It delegates accessibility semantics (ARIA `role="progressbar"`, `aria-valuenow`, `aria-valuemax`) to the `bits-ui` primitive and focuses on visual rendering.

## Component Structure

```svelte
<script lang="ts">
  import { Progress as ProgressPrimitive } from "bits-ui";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    max = 100,
    value,
    ...restProps
  }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props();
</script>
```

## The `translateX` Animation Technique

The indicator uses `transform: translateX(-{100 - (value ?? 0)}%)` instead of `width: {value}%`. This is a deliberate performance optimization.

- **`width` changes** trigger layout reflow on every animation frame — the browser must recalculate the geometry of surrounding elements.
- **`transform` changes** run entirely on the GPU compositor thread, producing smooth 60fps animation without touching the layout engine.

The math works as follows: at `value = 0`, the indicator is fully shifted left by 100% of its own width (`translateX(-100%)`), hiding it. At `value = 100`, shift is `0%`, showing the full bar. Intermediate values produce proportional fills. The `?? 0` nullish coalesce handles `undefined` (indeterminate state) by treating it as zero.

## Indeterminate State

When `value` is `undefined`, the bits-ui primitive sets `aria-valuenow` to undefined and may apply an indeterminate animation class. The inline style gracefully degrades to `translateX(-100%)` (empty bar), though for a proper indeterminate animation, consumers should add a CSS animation via the `class` prop.

## Props

- **`value`** (`number | undefined`): Current progress. `undefined` signals indeterminate state.
- **`max`** (`number`, default `100`): Maximum value. Allows non-percentage scales (e.g., steps out of 7).
- **`ref`** (bindable): DOM reference to the root element for programmatic measurement.
- **`class`**: Merged into the track's classes via `cn`.

## Visual Structure

```
[track: bg-muted, h-1, rounded-full, overflow-x-hidden]
  └── [indicator: bg-primary, size-full, transition-all, translateX offset]
```

The track uses `overflow-x-hidden` to clip the indicator when it is shifted left, ensuring the fill appears to grow from left to right rather than the indicator sliding into view from outside.

## Type Safety: `WithoutChildrenOrChild`

The `WithoutChildrenOrChild` utility type removes `children` and `child` from the props type. This prevents consumers from accidentally passing children, which would be silently ignored since the visual structure is fully internal. It makes the error surface explicit at the TypeScript level.

## Known Gaps

No built-in indeterminate animation is provided. If `value` is `undefined`, the bar renders as empty rather than showing a loading sweep. Consumers targeting indeterminate states need to add their own CSS animation.