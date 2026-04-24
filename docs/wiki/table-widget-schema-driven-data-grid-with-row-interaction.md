---
{
  "title": "Table Widget — Schema-Driven Data Grid with Row Interaction",
  "summary": "A flexible data table widget that renders structured row/column data with automatic column detection, multiple visual variants, an optional status indicator column, and full Ripple event system integration for row-click actions. It normalizes several column definition formats to accommodate the range of shapes that AI-generated specs may produce.",
  "concepts": [
    "data table",
    "row click",
    "EventDispatcher",
    "StateManager",
    "column normalization",
    "status dot",
    "variant classes",
    "Svelte context",
    "schema-driven",
    "tabular data"
  ],
  "categories": [
    "widget",
    "data",
    "display"
  ],
  "source_docs": [
    "f3f7ea3c6b202f9a"
  ],
  "backlinks": null,
  "word_count": 546,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

The Table widget sits at the intersection of data display and interaction. It renders arbitrary arrays of objects as a formatted grid, but also participates in Ripple's event dispatch system — row clicks can trigger state mutations, navigation, or API calls via the `onRowClick` handler, which routes through the standard `EventDispatcher` context.

## Column Definition Normalization

AI-generated specs and human-authored specs may use different column shape conventions. The widget accepts all of the following formats:

```typescript
// String shorthand
"name"

// accessorKey/header (TanStack Table style)
{ accessorKey: "name", header: "Name" }

// key/label (legacy style)
{ key: "name", label: "Name" }
```

The `$derived.by(() => { ... })` block normalizes all three into `{ accessorKey, header }` pairs. This defensive normalization prevents runtime key lookups from silently returning `undefined` when spec authors use inconsistent column shapes.

If no columns are specified, the widget auto-detects them from the first row's object keys — a useful fallback for dynamic data where the schema isn't known at spec-authoring time.

## Data Source Aliases

The widget accepts both `data` and `rows` props:

```typescript
const tableData = $derived(data ?? rows ?? []);
```

This tolerance for dual naming prevents breakage when specs or backends use either convention. The `?? []` terminal fallback ensures the `{#each}` block always has an array, avoiding a null-iteration error.

## Visual Variants

| Variant | Effect |
|---------|--------|
| `default` | Standard padding and borders |
| `compact` | Reduced padding and font size — for dense dashboards |
| `striped` | Alternating row background (even rows get `bg-muted/50`) |
| `minimal` | Removes horizontal borders — clean card-style look |

Variants are implemented as Tailwind JIT arbitrary variant selectors applied at the wrapper div, not per-cell. This keeps the per-cell markup clean and lets the variant be changed at runtime without re-rendering cell content.

## Status Dot Column

The `statusKey` prop names a field on each row that contains a CSS color value:

```svelte
<span
  class="mr-1.5 inline-block size-2 rounded-full align-middle"
  style="background:{row[statusKey]}"
></span>
```

The dot appears only on the first column (`ci === 0`) so it anchors visually to the row label. This is designed for status dashboards where rows represent services, jobs, or agents and a color communicates health (green/red/yellow) without consuming a full column.

## Row Click and Event Dispatch

Row clicks are routed through the `EventDispatcher` and `StateManager` Svelte contexts rather than a simple callback prop. This connects the table to Ripple's broader event system:

```typescript
await eventDispatcher.dispatch(onRowClick, {
  state: stateManager.state,
  data: dataStore ?? {},
  item: row,
  index
});
```

The dispatched payload includes the clicked row object, its index, current UI state, and the shared data store — giving event handlers full context to perform actions like navigating to a detail view, updating a filter, or triggering a fetch.

## Known Gaps

- **No pagination or virtualization**: All rows are rendered to the DOM. Tables with hundreds or thousands of rows will degrade performance.
- **No sorting or filtering UI**: The widget is display-only. Sorting and filtering must be handled by the caller before passing `data`.
- **Status dot accepts raw CSS color strings**: No validation of `row[statusKey]` before binding to `style`. An untrusted value could theoretically inject style content, though the inline `background:` property has limited XSS surface.