---
{
  "title": "Test Suite: DashboardManager — Widget CRUD, Reorder, and Change Events",
  "summary": "Comprehensive unit tests for DashboardManager covering widget add, remove, update, move, reorder, bulk load, ID generation, and the onChange subscription system. Tests verify that mutations produce correct state and reliably fire change callbacks, while load() deliberately does not trigger callbacks.",
  "concepts": [
    "DashboardManager",
    "widget CRUD",
    "addWidget",
    "removeWidget",
    "updateWidget",
    "moveWidget",
    "reorder",
    "load",
    "onChange",
    "change events",
    "revision counter",
    "partial reorder",
    "props merge"
  ],
  "categories": [
    "testing",
    "dashboard",
    "state-management",
    "test"
  ],
  "source_docs": [
    "c6b9d4ae496e1374"
  ],
  "backlinks": null,
  "word_count": 527,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite specifies the contract for `DashboardManager` — the reactive state manager for mutable dashboard widget lists. It was created alongside the dashboard feature to ensure that widget CRUD operations work correctly and that the change notification system behaves predictably for integration with persistent storage.

## Test Factory

```typescript
function widget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return { id: '', type: 'metric', title: 'Test Widget', ...overrides };
}
```

All tests use this factory to produce minimal valid widgets. Passing an empty `id` tests the auto-ID generation behavior.

## Factory Initialization

`createDashboardManager()` tests confirm the default state:
- Returns a `DashboardManager` instance
- Initializes with `widgets: []`
- Initializes with `layout: { type: 'grid', columns: 3, gap: 10 }`
- When given an initial spec, loads widgets and layout correctly

## addWidget

Four tests cover the add path:
- Appends to an empty dashboard
- **Generates an `id` starting with `w-`** when `widget.id === ''`
- **Preserves** a provided ID unchanged
- Appends multiple widgets in insertion order

The ID generation test is important because `DashboardRenderer` depends on unique IDs for Muuri item tracking. If this generation failed, the renderer would produce duplicate DOM keys.

## removeWidget

- Removes by ID, leaving other widgets intact
- No-op for a non-existent ID (does not throw)

## updateWidget

```typescript
mgr.updateWidget('w1', { props: { color: 'blue' } });
expect(mgr.spec.widgets[0].props).toEqual({ color: 'blue', size: 'lg' });
```

The `props` deep-merge test is critical: `updateWidget` must merge `props` rather than replace them. Shallow-merging the whole widget object but replacing `props` outright would silently discard existing prop values.

## moveWidget

- Moves `'a'` from index 0 to index 2 produces `['b', 'c', 'a']`
- Moving to the **same position** is a no-op (order and mutation preserved)
- Moving a non-existent ID is a no-op

## reorder

Three tests cover the reorder operation:
- Full reorder by ID list
- **Partial reorder**: IDs not in the list are appended at the end in original order. This prevents data loss if the reorder list is derived from a UI that only shows a subset of widgets.
- Unknown IDs in the list are silently ignored

## load

Replaces the entire spec (widgets + layout) with a new one. This is the bulk-load path used when mounting a persisted dashboard.

## getWidget

Returns a widget by ID or `undefined` for a missing ID.

## onChange — Change Notification Contract

The most detailed describe block covers the change subscription system:

- Fires on `addWidget`, `removeWidget`, `updateWidget`, `moveWidget`, and `reorder`
- Callback receives the current `spec` as argument
- `unsub()` stops future callbacks
- **`load()` does NOT fire the callback**

The last assertion is the key design decision: `load()` is a programmatic bulk-set (e.g., initial hydration from storage), not a user action. Firing `onChange` on `load` would create an infinite loop in the `DashboardRenderer`'s `onSpecChanged → parent saves → parent reloads → triggers onChange` cycle.

## Known Gaps

No TODO or FIXME markers. The test suite does not cover concurrent mutations from multiple async operations, nor does it verify that `revision` increments correctly on each mutation (the revision counter is referenced in `DashboardRenderer` for change-detection logic).
