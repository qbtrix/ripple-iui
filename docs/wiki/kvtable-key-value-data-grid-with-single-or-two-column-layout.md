---
{
  "title": "KvTable: Key-Value Data Grid with Single or Two-Column Layout",
  "summary": "KvTable renders an array of key-value pairs in a bordered, optionally-striped grid that can be displayed in one or two columns — with automatic midpoint splitting for the two-column case. It exists to present dense structured data (financial metrics, specs, metadata) in a compact tabular layout without requiring a full HTML table.",
  "concepts": [
    "key-value table",
    "two-column layout",
    "Math.ceil midpoint split",
    "striped rows",
    "tabular numerals",
    "financial metrics grid",
    "border-radius overflow hidden",
    "data grid",
    "$derived.by"
  ],
  "categories": [
    "widget",
    "research",
    "data-display",
    "layout"
  ],
  "source_docs": [
    "a3a287c1fd5be11d"
  ],
  "backlinks": null,
  "word_count": 455,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`KvTable` is the go-to widget for dense factual data in research responses — fundamentals tables, specification sheets, metadata grids, or any structured list of labeled values. It renders a contained, bordered grid with row separators and optional alternating row backgrounds, all without using an HTML `<table>` element.

## Props

```svelte
interface Props {
  rows: KvRow[];         // Required array of { key: string; value: string }
  columns?: 1 | 2;       // Layout mode, default 1
  striped?: boolean;     // Alternating row backgrounds, default true
  class?: string;
}
```

## Column Splitting

The most interesting logic is the `groups` derived:

```svelte
const groups = $derived.by(() => {
  if (columns === 1) return [rows];
  const mid = Math.ceil(rows.length / 2);
  return [rows.slice(0, mid), rows.slice(mid)];
});
```

`Math.ceil` ensures the first column gets the extra row when the total is odd. This is the visually preferred behavior — a financial metrics table with 9 rows would split 5/4 (left/right), not 4/5. The right column being shorter is less visually awkward than the left column being shorter.

The component then iterates over `groups`, rendering each as a `.rkv-col` div. In one-column mode, `groups` is `[rows]` — a single group containing all rows — so the same template works for both modes without branching.

## Striping

Alternating row backgrounds use the row index within each column group:

```svelte
class:rkv-striped={striped && i % 2 === 0}
```

Importantly, striping resets independently per column when in two-column mode. This ensures even-indexed rows in both columns have the same background, which looks natural when the columns sit side-by-side.

## Value Truncation

```css
.rkv-val {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Values are right-aligned and truncated to fit their cell. Long strings (like company names in a metadata table) get ellipsis treatment rather than overflowing or wrapping, preserving grid alignment.

## Typography

Values use `font-variant-numeric: tabular-nums` so that numeric values in the same column align on their digit positions. This is essential for financial tables where comparing numbers at a glance requires vertical digit alignment.

## Border Architecture

The outer container uses a `border` + `border-radius` + `overflow: hidden` combo to achieve clean rounded corners without needing to add `border-radius` to individual rows. The two-column divider is achieved by:

```css
.rkv-2col .rkv-col:first-child {
  border-right: 1px solid hsl(var(--border));
}
```

Row separators use `border-bottom` on all rows except the last (`:not(:last-child)`), preventing a double-border at the bottom of the container.

## Known Gaps

- No support for clicking rows or hovering rows for interactivity (e.g. showing a tooltip for a financial metric definition).
- The `value` field in `KvRow` is typed as `string`, so numerical values must be pre-formatted by the caller. There is no built-in number formatting, currency symbols, or percentage handling.