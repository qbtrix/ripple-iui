---
{
  "title": "Table Footer — Summary Row Container with Subtle Background",
  "summary": "TableFooter renders a styled `\u003ctfoot\u003e` element for housing summary or aggregate rows at the bottom of a table, applying a muted semi-transparent background and a top border while removing the bottom border from its last row to prevent double borders.",
  "concepts": [
    "table",
    "tfoot",
    "table footer",
    "bg-muted",
    "border-t",
    "font-medium",
    "last-row border",
    "HTMLTableSectionElement",
    "WithElementRef",
    "data-slot",
    "summary rows",
    "semantic HTML"
  ],
  "categories": [
    "ui",
    "table",
    "data-display",
    "layout"
  ],
  "source_docs": [
    "32a2b703dfda4803"
  ],
  "backlinks": null,
  "word_count": 411,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `<tfoot>` element groups rows that contain summary, totals, or aggregate data — the semantic counterpart to `<thead>` at the bottom of the table. `TableFooter` adds consistent visual treatment: a subtle background tint that distinguishes footer rows from body rows, plus a top border that visually separates the footer section.

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

<tfoot
  bind:this={ref}
  data-slot="table-footer"
  class={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
  {...restProps}
>
  {@render children?.()}
</tfoot>
```

## Styling Breakdown

- **`bg-muted/50`** — A 50% opacity tint of the muted background color. This creates a subtle visual distinction between footer rows (totals, averages) and the body rows (raw data) without the harsh contrast of a fully opaque background. The `/50` opacity ensures the footer blends with both light and dark themes without needing a separate dark-mode override.
- **`border-t`** — Adds a top border that visually separates the footer from the last body row. Combined with `TableBody`'s `[&_tr:last-child]:border-0`, this produces a clean single-weight line between body and footer.
- **`font-medium`** — Summary values (totals, sums) typically warrant slightly bolder text to emphasize their prominence over individual data rows. This is a sensible default that consumers can override.
- **`[&>tr]:last:border-b-0`** — Removes the bottom border from the last `<tr>` inside `<tfoot>`. This mirrors the same fix in TableBody, preventing a double border at the very bottom of the table when the table itself has a surrounding border.

## The Border Symmetry Pattern

The table component family manages borders in a defensive layered way:

1. Each `<tr>` (via `TableRow`) has a `border-b`
2. `TableBody` zeroes the last row's bottom border: `[&_tr:last-child]:border-0`
3. `TableFooter` zeroes its last row's bottom border: `[&>tr]:last:border-b-0`
4. `TableFooter` has a `border-t` that creates the body/footer separator

This means the table renders correctly regardless of whether a footer is present — the body/footer boundary is always a single line, and there is never a trailing border below the last row.

## Semantic Value of `<tfoot>`

Beyond CSS, `<tfoot>` carries structural meaning. Browsers originally rendered `<tfoot>` content before `<tbody>` in printed tables (for page overflow scenarios). Screen readers expose the footer section as a separate region. And when tables are implemented with sticky headers/footers, `<tfoot>` is the correct semantic hook for the sticky footer row.

## Known Gaps

None. The component is complete for its intended use.