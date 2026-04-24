---
{
  "title": "Table Head — Column Header Cell with Checkbox Spacing",
  "summary": "TableHead renders a styled `\u003cth\u003e` element for column header cells, applying consistent height, horizontal padding, left-aligned text, and the same checkbox-column padding fix used in TableCell. It ensures header cells align with their body counterparts in selection columns.",
  "concepts": [
    "table",
    "th",
    "table head",
    "column header",
    "scope",
    "HTMLThAttributes",
    "h-10",
    "text-left",
    "checkbox padding",
    "has selector",
    "WithElementRef",
    "data-slot",
    "align-middle"
  ],
  "categories": [
    "ui",
    "table",
    "accessibility",
    "data-display"
  ],
  "source_docs": [
    "d3c793b0e6d0884c"
  ],
  "backlinks": null,
  "word_count": 477,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

TableHead (`<th>`) is the column header cell component. It sets the visual and semantic baseline for a column: what the column contains, how it should be interpreted, and (via ARIA attributes) how assistive technology should announce it. Ripple's wrapper applies a standard set of defaults that keep all column headers consistent across the application.

## Component Design

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLThAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
  bind:this={ref}
  data-slot="table-head"
  class={cn(
    "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</th>
```

## Default Styles

- **`text-foreground`** — Header text uses the full foreground color (not muted), giving it visual prominence over body cell text which may be de-emphasized.
- **`h-10`** — Fixed 40px row height for headers. Consistent header height prevents layout shift when table data loads and creates a stable visual anchor at the top of the table.
- **`px-2`** — 8px horizontal padding, matching the `p-2` in TableCell, so header text aligns with body text in the same column.
- **`text-left`** — Overrides the browser default of center-aligned `<th>` text. Left-aligned headers are the dominant convention for data tables (right-align is typically reserved for numeric columns, which can be added via `className`).
- **`align-middle`** — Vertically centers the header text within the 40px row, matching the body cell alignment.
- **`font-medium`** — Slightly bolder than body text to signal that this is a label, not a value.
- **`whitespace-nowrap`** — Prevents column header text from wrapping, keeping rows at a predictable height.

## Checkbox Column Consistency

The `[&:has([role=checkbox])]:pr-0` class mirrors the identical rule in TableCell. Without this, the selection column header checkbox would have extra right padding compared to the body cell checkboxes, causing the two to visually misalign even though they share the same column.

This is a cross-component coordination problem solved with CSS rather than props or parent coordination: both components independently apply the same rule, so alignment is guaranteed without them needing to know about each other.

## `HTMLThAttributes` Type

TableHead uses `HTMLThAttributes` (not the generic `HTMLAttributes<HTMLElement>`), which includes `<th>`-specific attributes:
- `scope` (`"col"` | `"row"` | `"colgroup"` | `"rowgroup"`) — critical for accessibility in complex tables
- `colspan` and `rowspan` — for spanning cells in multi-level headers
- `abbr` — provides an abbreviated label for screen readers in wide tables

Passing `scope="col"` on header cells is a recommended practice for all data tables; the type makes this attribute discoverable via TypeScript autocompletion.

## Known Gaps

None. The component is complete. The `scope="col"` attribute is not applied by default (it's available through `restProps`) — a case could be made for defaulting to `scope="col"` to improve accessibility in the common case, but leaving it explicit keeps the component flexible for row-header use cases.