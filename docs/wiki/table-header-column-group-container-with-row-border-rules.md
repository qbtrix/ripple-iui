---
{
  "title": "Table Header — Column Group Container with Row Border Rules",
  "summary": "TableHeader renders a styled `\u003cthead\u003e` element that groups all column header rows, applying a CSS rule that adds a bottom border to every `\u003ctr\u003e` it contains. This ensures header rows are always visually separated from the data body without requiring individual row styling.",
  "concepts": [
    "table",
    "thead",
    "table header",
    "border-b",
    "arbitrary Tailwind selector",
    "HTMLTableSectionElement",
    "WithElementRef",
    "data-slot",
    "multi-level headers",
    "border cascade",
    "container-level CSS"
  ],
  "categories": [
    "ui",
    "table",
    "data-display",
    "layout"
  ],
  "source_docs": [
    "a5a1add2ce67ab43"
  ],
  "backlinks": null,
  "word_count": 457,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

TableHeader (`<thead>`) groups the column header rows of a table — typically a single row of `<th>` cells, but sometimes multiple rows in complex tables with grouped or multi-level headers. Ripple's wrapper applies a targeted border rule that ensures every header row has a visible bottom border, establishing a clear visual boundary between the header region and the table body.

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

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn("[&_tr]:border-b", className)}
  {...restProps}
>
  {@render children?.()}
</thead>
```

## The `[&_tr]:border-b` Pattern

This Tailwind arbitrary selector adds `border-bottom-width: 1px` to every `<tr>` inside the `<thead>`. The selector targets descendants at any depth (`_tr` = space combinator = all descendant `<tr>` elements).

This works in concert with the rest of the table border system:

- `TableRow` applies a default border via its own classes
- `TableHeader` reinforces that border for all header rows specifically
- `TableBody` removes the last row's border (`[&_tr:last-child]:border-0`) to avoid doubling with the footer's `border-t`

The result: header rows always have a bottom border, body rows have borders except the last, and the footer has a top border. The full table renders a consistent grid without any double-borders at section boundaries.

## Why Style at the `<thead>` Level?

Placing the border rule on the container rather than individual rows or header cells has a key advantage: it works regardless of how many header rows are present. A table with two header rows (e.g., a group header above column headers) gets both rows bordered without extra class composition. Consumers don't need to know to add `border-b` to every `<tr>` they place inside `<TableHeader>`.

This is a defensive CSS architecture decision: encode invariants at the container, not at the leaf.

## Relationship to the Table Component Family

TableHeader has no direct dependency on any sibling component — it doesn't know about TableBody or TableFooter. Its border rule is self-contained. The system works because each section component independently applies its own border conventions, and the conventions are designed to compose without conflicts:

| Component | Border rule |
|-----------|------------|
| `TableHeader` | All `<tr>` children get `border-b` |
| `TableBody` | Last `<tr>` child loses `border-b` |
| `TableFooter` | Gets `border-t`; last `<tr>` loses `border-b` |

## Props and Type

The type `WithElementRef<HTMLAttributes<HTMLTableSectionElement>>` is shared with `TableBody` and `TableFooter` — all three wrap `<thead>`, `<tbody>`, and `<tfoot>`, which are all typed as `HTMLTableSectionElement` in the DOM. This consistency means the three components are interchangeable from a prop-signature perspective.

## Known Gaps

None. The component is complete and the border cascade handles all standard table configurations correctly.