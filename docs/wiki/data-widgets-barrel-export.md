---
{
  "title": "Data Widgets Barrel Export",
  "summary": "Barrel file that re-exports Ripple's data-display widgets — `Table` and `Chart` — from a single import path. These two widgets cover the primary structured-data visualization needs in Ripple-generated UIs.",
  "concepts": [
    "barrel export",
    "data widgets",
    "Table",
    "Chart",
    "module organization",
    "widget registry"
  ],
  "categories": [
    "module",
    "data",
    "barrel"
  ],
  "source_docs": [
    "192de08d59deb361"
  ],
  "backlinks": null,
  "word_count": 229,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

The `data/` widget category houses components whose primary role is rendering structured data rather than decorative content. The barrel provides a stable public import surface:

```typescript
export { default as Table } from './Table.svelte';
export { default as Chart } from './Chart.svelte';
```

## What Gets Exported

### `Table`
A schema-driven data grid with column normalization, row-click event dispatch, visual variants, and status dot support. The primary widget for displaying lists of structured records.

### `Chart`
A multi-type data visualization component wrapping Apache ECharts. Supports 10 chart types with theme-aware colors and resize reactivity.

## Data Widget Characteristics

Data widgets differ from display widgets in two key ways:

1. **They consume structured input** — arrays of objects, not simple strings or primitive values.
2. **They may dispatch events** — `Table` is wired to Ripple's `EventDispatcher`/`StateManager` contexts, making it interactive, not just presentational.

`Chart` is currently presentation-only (no row/segment click dispatch), though the `chartSlot` snippet prop allows a parent to wrap the container with custom interaction layers.

## Extension Notes

Future data widgets likely to join this barrel:
- `DataGrid` — more advanced table with sorting/filtering
- `Timeline` — temporal event sequence
- `TreeView` — hierarchical data display
- `JsonViewer` — collapsible JSON tree

## Known Gaps

No gaps in the barrel itself. The surface area is intentionally small — two well-scoped components rather than a sprawling collection.