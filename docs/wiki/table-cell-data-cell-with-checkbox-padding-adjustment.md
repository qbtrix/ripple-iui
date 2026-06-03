---
{
  "title": "Table Cell — Data Cell with Checkbox Padding Adjustment",
  "summary": "TableCell renders a styled `\u003ctd\u003e` element with consistent padding, vertical alignment, and a defensive CSS rule that removes right padding when the cell contains a checkbox. This prevents double-spacing in selection column cells without requiring conditional props or wrapper divs.",
  "concepts": [
    "table",
    "td",
    "table cell",
    "has selector",
    "checkbox padding",
    "align-middle",
    "whitespace-nowrap",
    "HTMLTdAttributes",
    "WithElementRef",
    "colspan",
    "rowspan",
    "data-slot",
    "CSS :has"
  ],
  "categories": [
    "ui",
    "table",
    "data-display",
    "layout"
  ],
  "source_docs": [
    "74106aa62ac91587"
  ],
  "backlinks": null,
  "word_count": 393,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

TableCell is the data cell component in ripple's table family. It wraps a `<td>` element with typography-consistent defaults and a targeted workaround for a common table layout issue: checkbox columns need less internal spacing than text columns.

## Component Design

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLTdAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td
  bind:this={ref}
  data-slot="table-cell"
  class={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
  {...restProps}
>
  {@render children?.()}
</td>
```

## Default Styles

- **`p-2`** — 8px padding on all sides. Compact but readable; matches the header cell's `px-2` horizontal padding.
- **`align-middle`** — Vertically centers cell content. Without this, `<td>` defaults to `vertical-align: baseline`, which causes misalignment when cells in the same row have different content heights (e.g., a text cell next to a cell containing a button or badge).
- **`whitespace-nowrap`** — Prevents cell text from wrapping across lines. Tables with wrapping text become unpredictable in width distribution. If text wrapping is needed for a specific column, it can be overridden via `className`.

## The Checkbox Padding Pattern

The class `[&:has([role=checkbox])]:pr-0` removes right padding from cells that contain an element with `role="checkbox"`. This is a recurring design problem in data tables:

- Selection columns are typically narrow (≈40px)
- The checkbox itself provides visual spacing at its edges
- Adding `p-2` (8px) right padding on top of the checkbox's own margin creates excessive whitespace between the checkbox and the next column
- `pr-0` removes exactly the right-side padding that causes this gap

The `:has()` CSS selector evaluates the cell's content at the CSS engine level — no JavaScript, no prop, no class toggle needed. It fires whenever a `[role=checkbox]` descendant exists, which covers both native `<input type="checkbox">` and custom checkbox components that correctly set the ARIA role.

This is the same pattern used in `TableHead` for header cells in selection columns, ensuring consistent spacing between header and body rows.

## `HTMLTdAttributes` Type

Unlike TableBody and TableHeader which use the generic `HTMLAttributes<HTMLTableSectionElement>`, TableCell uses `HTMLTdAttributes` — a more specific type that includes `<td>`-only attributes like `colspan`, `rowspan`, `headers`, and `scope`. This ensures TypeScript enforces the correct attribute set for data cells.

## Known Gaps

None. The `:has()` selector has full browser support as of 2023 and works correctly in the browser environments ripple targets.