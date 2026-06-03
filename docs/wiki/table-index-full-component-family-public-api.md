---
{
  "title": "Table Index — Full Component Family Public API",
  "summary": "The table index module assembles all eight table sub-components — Root, Body, Caption, Cell, Footer, Head, Header, Row — into a single importable surface with both short canonical names and full descriptive aliases. This barrel file is the only import consumers need for complete table functionality.",
  "concepts": [
    "table",
    "barrel file",
    "index module",
    "compound component",
    "namespace import",
    "dual export",
    "thead",
    "tbody",
    "tfoot",
    "th",
    "td",
    "caption",
    "HTML table",
    "tree shaking"
  ],
  "categories": [
    "ui",
    "table",
    "module-organization",
    "data-display"
  ],
  "source_docs": [
    "45cf1acd6467c786"
  ],
  "backlinks": null,
  "word_count": 463,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Table component family is one of the more complex widget families in ripple, consisting of eight distinct components that map to HTML table element types. The index file compiles all of them into a single export surface, so consumers never need to know the internal file structure.

```typescript
import Root    from "./table.svelte";
import Body    from "./table-body.svelte";
import Caption from "./table-caption.svelte";
import Cell    from "./table-cell.svelte";
import Footer  from "./table-footer.svelte";
import Head    from "./table-head.svelte";
import Header  from "./table-header.svelte";
import Row     from "./table-row.svelte";

export {
  Root, Body, Caption, Cell, Footer, Head, Header, Row,
  Root as Table, Body as TableBody, Caption as TableCaption,
  Cell as TableCell, Footer as TableFooter, Head as TableHead,
  Header as TableHeader, Row as TableRow,
};
```

## Component Mapping

| Export | HTML element | Role |
|--------|-------------|------|
| `Root` / `Table` | `<table>` | Container, scroll wrapper |
| `Header` / `TableHeader` | `<thead>` | Column header group |
| `Body` / `TableBody` | `<tbody>` | Data row group |
| `Footer` / `TableFooter` | `<tfoot>` | Summary row group |
| `Row` / `TableRow` | `<tr>` | Single row |
| `Head` / `TableHead` | `<th>` | Header cell |
| `Cell` / `TableCell` | `<td>` | Data cell |
| `Caption` / `TableCaption` | `<caption>` | Accessible table description |

## Dual Naming Strategy

The same component is exported under two names — a short generic name (`Root`, `Body`, `Head`) and a fully qualified name (`Table`, `TableBody`, `TableHead`).

The **short names** support namespace import style:
```typescript
import * as Table from "$lib/components/ui/table";
// <Table.Root>, <Table.Header>, <Table.Body>, <Table.Row>, ...
```
This is the idiomatic way to use compound components — it reads clearly and eliminates naming conflicts when multiple widgets are on the same page.

The **qualified names** support destructured imports:
```typescript
import { Table, TableBody, TableRow, TableCell } from "$lib/components/ui/table";
// <Table>, <TableBody>, <TableRow>, <TableCell>
```
This style is more verbose but works in environments where namespace imports are disfavored, or when only a few sub-components are needed.

## Why Eight Files Instead of One?

Each sub-component is isolated in its own file for several reasons:

1. **Tree shaking**: Bundlers can eliminate unused sub-components if only some are imported (though in practice, most uses import all of them via namespace).
2. **Independent styling**: Each file contains only the styles relevant to its HTML element, keeping files small and readable.
3. **Independent testability**: Each element can be tested in isolation without mounting the full table tree.
4. **Incremental enhancement**: Individual components can be swapped or extended independently — e.g., replacing `TableRow` with a version that supports drag-and-drop.

## Known Gaps

The `table-row.svelte` component is imported but not independently documented in this batch. Its exports appear correctly in this index. No logic issues are present in the index itself.