---
{
  "title": "DashboardManager — Reactive Widget List State for Persistent Dashboards",
  "summary": "DashboardManager is the reactive state container for a mutable dashboard widget list. It exposes a CRUD API (add, remove, update, move, reorder) plus an `onChange` subscription for notifying parent components when the spec changes, supporting persistence in platforms that save dashboard layouts across sessions.",
  "concepts": [
    "DashboardManager",
    "DashboardWidget",
    "DashboardSpec",
    "revision counter",
    "onChange subscription",
    "addWidget",
    "removeWidget",
    "updateWidget",
    "moveWidget",
    "reorder",
    "load",
    "Svelte 5 state",
    "persistent dashboard"
  ],
  "categories": [
    "dashboard",
    "state-management",
    "widget-system"
  ],
  "source_docs": [
    "fee1cc3ed242c20d"
  ],
  "backlinks": null,
  "word_count": 615,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DashboardManager` separates the widget list state from the `DashboardRenderer` component, following a manager/view pattern. `DashboardRenderer` renders whatever `manager.spec` contains; `DashboardManager` owns the mutations. This split allows the spec to be persisted externally, shared across components, and mutated programmatically (e.g., by an AI agent adding a widget).

## Interfaces

```typescript
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  span?: number;
  props?: Record<string, any>;
  children?: UINode[];
  data?: any;
}

export interface DashboardSpec {
  widgets: DashboardWidget[];
  layout?: { type: 'grid' | 'masonry'; columns?: number; gap?: number; };
}
```

`DashboardWidget` is deliberately loose (`props: Record<string, any>`, `data?: any`) to accommodate the diverse set of widget types and AI-generated data shapes that a dashboard may contain.

## Svelte 5 Reactive State

```typescript
spec = $state<DashboardSpec>({ widgets: [], layout: { type: 'grid', columns: 3, gap: 10 } });
revision = $state(0);
```

Both `spec` and `revision` are public `$state` properties (no underscore prefix, no getter). This is intentional: `DashboardRenderer` accesses `manager.spec.widgets` in its `{#each}` template, and needs the reactive proxy directly — wrapping in a getter would still work but adds unnecessary indirection.

`revision` is a monotonically increasing integer that `DashboardRenderer` uses to distinguish between an external spec load (which it should absorb) and its own mutation (which it should not re-absorb in an infinite loop).

## Mutation API

All mutations follow the same pattern: replace `this.spec` with a new object (immutable for reactivity), then call `emitChange()`.

### addWidget — Auto-ID Generation

```typescript
if (!widget.id) {
  widget.id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
this.spec = { ...this.spec, widgets: [...this.spec.widgets, widget] };
```

The ID combines a timestamp and 4 random base-36 characters. This is not cryptographically unique but is sufficient for widget identity within a single session.

### updateWidget — Shallow + Props-Deep Merge

```typescript
widgets: this.spec.widgets.map(w =>
  w.id === widgetId
    ? { ...w, ...updates, props: { ...w.props, ...updates.props } }
    : w
)
```

Top-level widget fields are shallow-merged. `props` is explicitly deep-merged one level. This allows `updateWidget('w1', { props: { color: 'blue' } })` to change only the `color` prop without discarding existing props like `size` or `variant`.

### moveWidget — Splice-Based Reorder

```typescript
const [widget] = widgets.splice(fromIndex, 1);
widgets.splice(toIndex, 0, widget);
```

Classic splice-based array reorder. A same-index guard (`if (fromIndex === toIndex) return`) prevents a no-op mutation and unnecessary `emitChange` call.

### reorder — ID-List Reorder with Safety

```typescript
const reordered = widgetIds.map(id => widgetMap.get(id)).filter(Boolean);
for (const w of this.spec.widgets) {
  if (!widgetIds.includes(w.id)) reordered.push(w);
}
```

The safety append ensures that widgets not in the `widgetIds` list are appended rather than lost. This is critical when Muuri emits a reorder event from user drag: Muuri only includes visible items in the reorder, but the manager may have hidden or off-screen widgets.

### load — No onChange Emission

```typescript
load(spec: DashboardSpec) {
  this.spec = { ...spec };
  // Note: no emitChange() call
}
```

`load` is intentionally silent. The `DashboardRenderer` calls `load` when the parent's `spec` prop changes. If `load` fired `onChange`, the `onSpecChanged` callback would trigger, the parent would save the just-received spec back to storage, and a loop would form.

## onChange Subscription

```typescript
onChange(handler: SpecChangeHandler) {
  this.changeHandlers.add(handler);
  return () => this.changeHandlers.delete(handler);
}
```

Returns an unsubscribe function, following the standard Svelte/RxJS cleanup pattern. `emitChange` increments `revision` before calling handlers, so handlers that read `manager.revision` always see the post-mutation value.

## Known Gaps

- `addWidget` mutates the `widget` parameter directly (`widget.id = ...`) before pushing it into the spec. Callers that reuse the same widget object would see their reference mutated.
- The `layout` field is not validated — a caller could set `columns: -1` and it would pass through to `DashboardRenderer` unchanged.
