---
{
  "title": "DashboardRenderer — Muuri-Powered Drag-and-Drop Dashboard Layout",
  "summary": "DashboardRenderer renders `intent='dashboard'` specs as an interactive grid using Muuri for drag-and-drop, dynamic resizing, and auto-packing. It bridges the declarative `DashboardSpec` widget list with Muuri's DOM-level layout engine, handling widget normalization, multi-format data coercion, and per-widget controls.",
  "concepts": [
    "DashboardRenderer",
    "Muuri",
    "drag-and-drop",
    "widget normalization",
    "DashboardManager",
    "dashboardSpec",
    "autoArrange",
    "fitItemsToContent",
    "intent=dashboard",
    "Svelte 5",
    "tick",
    "requestAnimationFrame",
    "widget controls"
  ],
  "categories": [
    "layout",
    "widget",
    "dashboard",
    "rendering"
  ],
  "source_docs": [
    "d7bfe4c7b72a0405"
  ],
  "backlinks": null,
  "word_count": 650,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DashboardRenderer.svelte` renders a live, interactive dashboard from a `UniversalSpec` with `intent='dashboard'`. It integrates Muuri (a JavaScript grid library) for drag-to-reorder, pointer-based manual resize, and gap-filling auto-layout. The component is the visual layer over `DashboardManager`, which owns the mutable widget list.

## Props

```typescript
interface Props {
  spec: UniversalSpec;
  onSpecChanged?: (spec: DashboardSpec) => void;
}
```

`onSpecChanged` allows the parent (e.g., a persistent pocket) to persist the dashboard layout whenever a widget is added, removed, or reordered.

## Spec Derivation and ID Deduplication

A `$derived.by` block converts the raw `UniversalSpec` into a typed `DashboardSpec`:

```svelte
let dashboardSpec = $derived.by((): DashboardSpec => {
  const seen = new Set<string>();
  const widgets = rawWidgets.map((w, i) => {
    let id = w.id ?? `w-${i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return { ...w, id };
  });
  // ...
});
```

The deduplication guard exists because AI-generated specs sometimes produce widgets with duplicate or missing IDs. Muuri requires unique DOM identifiers per item, and Svelte's `{#each}` keyed by `widget.id` will silently skip or merge duplicate keys without this guard.

## Muuri Integration

Muuri is loaded asynchronously on mount to avoid SSR issues:

```typescript
const { default: Muuri } = await import('muuri');
muuriGrid = new Muuri(gridEl, { ... });
```

Muuri operates on `.muuri-item` DOM elements. Because Svelte controls the DOM and Muuri has its own DOM tracking, two synchronization challenges arise:

1. **Adding items**: After Svelte renders new widgets into the `{#each}`, Muuri doesn't know about them. A `$effect` watches `manager.spec.widgets` and, after `tick()` + `requestAnimationFrame`, finds new `.muuri-item` elements not in Muuri's item list and calls `muuriGrid.add()`.

2. **Removing items**: Muuri holds references to removed elements. The same `$effect` finds Muuri items whose elements are no longer in the DOM and calls `muuriGrid.remove()`.

The double async (`tick().then(() => requestAnimationFrame(...))`) is required because `tick()` flushes Svelte's DOM updates but not the browser layout — `requestAnimationFrame` ensures the browser has painted before Muuri reads element dimensions.

## widgetToNode — Data Format Normalization

The `widgetToNode` function converts a `DashboardWidget` to a `UINode` for `NodeRenderer`. Its large `switch` statement handles multiple data formats per widget type:

- **table**: Handles 4 distinct formats (standard rows array, nested `{columns, data}`, nested `{columns, rows}`, top-level `columns` prop). It auto-derives columns from object keys if none are specified, and converts positional arrays to keyed objects.
- **feed**: Unwraps AI spec format `{ items: [...] }` vs plain array.
- **text**: Unwraps `{ content: "markdown" }` vs plain string.
- **flex**: Converts stat-list format `[{label, value, trend}]` into a nested flex tree.
- **metric**: Spreads a flat data object onto props.

This normalization exists because AI-generated dashboard specs vary in how they structure widget data — the renderer accommodates multiple valid shapes rather than requiring the spec author to use a single canonical format.

## Widget Controls

Each widget card exposes three controls in a per-widget dropdown menu:

- **Resize**: Attaches `pointermove`/`pointerup` listeners to drag-resize the widget inline
- **Size cycle**: Cycles the `size` prop (`sm → md → lg → sm`) via `manager.updateWidget()`
- **Remove**: Calls `manager.removeWidget()` and closes the menu

The dropdown is controlled by `openMenuId = $state<string | null>()` — only one menu is open at a time. A global `onclick` on the dashboard div closes any open menu when clicking outside.

## autoArrange

```typescript
function autoArrange() {
  // Clear inline sizes, fit to content, sort largest first, layout
  muuriGrid.sort((a, b) => bArea - aArea);
}
```

Sorts widgets by rendered area (largest first) for optimal bin-packing. Exposed via Svelte context (`dashboard-actions`) and a DOM event listener (`dashboard:auto-arrange`) so parent components and sibling widgets can trigger it.

## Known Gaps

- `fitItemsToContent` uses `scrollHeight + 10` as a height heuristic. This may under-estimate height for widgets whose content loads asynchronously after mount.
- The revision-guard logic (`if (manager.revision > lastLoadedRevision)`) that prevents reloading a spec the manager itself mutated may produce a one-frame skip on rapid external spec updates.
