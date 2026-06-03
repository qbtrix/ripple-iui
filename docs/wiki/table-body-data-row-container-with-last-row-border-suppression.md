---
{
  "title": "Table Body — Data Row Container with Last-Row Border Suppression",
  "summary": "TableBody renders a styled `\u003ctbody\u003e` element that wraps the data rows of a table, applying a targeted CSS rule to remove the bottom border from the last row. This prevents a double-border artifact at the boundary between `\u003ctbody\u003e` and `\u003ctfoot\u003e` (or the table edge).",
  "concepts": [
    "table",
    "tbody",
    "last-child selector",
    "border fix",
    "WithElementRef",
    "HTMLTableSectionElement",
    "cn utility",
    "bindable ref",
    "Svelte render",
    "arbitrary Tailwind selector",
    "data-slot"
  ],
  "categories": [
    "ui",
    "table",
    "data-display",
    "layout"
  ],
  "source_docs": [
    "e3ec1611effda1f3"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TableBody` is the `<tbody>` wrapper in ripple's table component family. Its primary visual contribution is small but important: it suppresses the bottom border of the last row it contains, preventing a common CSS artifact in bordered tables.

## Component Design

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLTableSectionElement>> = $props();
</script>

<tbody
  bind:this={ref}
  data-slot="table-body"
  class={cn("[&_tr:last-child]:border-0", className)}
  {...restProps}
>
  {@render children?.()}
</tbody>
```

## The Last-Row Border Fix

The class `[&_tr:last-child]:border-0` is an arbitrary Tailwind selector that applies `border-width: 0` to the last `<tr>` inside this `<tbody>`. This is necessary because:

1. `TableRow` renders each row with a bottom border by default (via a `border-b` class)
2. When `<tbody>` is followed by `<tfoot>`, the tfoot has its own `border-t` (top border)
3. Without this fix, the last data row's `border-b` and the footer's `border-t` stack, producing a double-weight border line

By zeroing the last row's border at the body level, the table achieves a clean single-line separation between body and footer — without requiring the row itself to know whether it's the last one, and without requiring parent components to pass `isLast` props down the tree.

This is a defensive CSS pattern: the fix lives at the container level, closest to where the problem occurs, and it is self-contained — adding or removing rows doesn't require any code change to maintain the correct visual output.

## Props

- **`ref`** (`$bindable(null)`) — Bindable DOM reference for the `<tbody>` element. Useful for measuring scroll position, implementing virtual scrolling, or programmatic focus.
- **`class` / `className`** — Merged with the base class using `cn()`. Consumers can add spacing, background, or other styles without losing the border fix.
- **`children`** — Rendered via `{@render children?.()}`. The `?.()` null-safe call means an empty TableBody renders without error.
- **`...restProps`** — All standard `HTMLTableSectionElement` attributes pass through: `id`, `aria-*`, event handlers, etc.

## `WithElementRef` Type

This utility type wraps the standard HTML attribute type and adds a `ref` prop typed as `HTMLTableSectionElement | null`. Without it, Svelte's `bind:this` would accept any element type, losing TypeScript's guarantee that `ref` always points to a table section element.

## Known Gaps

None. The component is complete and the border fix correctly handles all common table configurations.