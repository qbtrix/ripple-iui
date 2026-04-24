---
{
  "title": "Dashboard Grid Slot Widget",
  "summary": "A grid cell wrapper used inside the `Dashboard` layout widget that controls column span and prevents child overflow from breaking the grid. Each slot carries identity metadata (`slotId`, `itemId`) intended for future drag-and-drop or serialization use.",
  "concepts": [
    "grid slot",
    "column span",
    "min-width: 0",
    "grid overflow",
    "dashboard layout",
    "slotId",
    "itemId",
    "CSS grid cell",
    "Snippet",
    "DashboardSlot",
    "DashboardRenderer"
  ],
  "categories": [
    "layout",
    "widget",
    "dashboard"
  ],
  "source_docs": [
    "5ba1eab496effe59"
  ],
  "backlinks": null,
  "word_count": 454,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DashboardSlot` is the companion to `Dashboard`. While `Dashboard` owns the grid container, `DashboardSlot` wraps each cell and manages its column span. Rendering a widget inside a slot ensures the grid geometry is respected even when widget content is wider than the column.

## Props

| Prop | Type | Default | Purpose |
|------|------|---------|--------|
| `slotId` | `string` | required | Identity for the slot position |
| `itemId` | `string` | required | Identity for the widget occupying the slot |
| `span` | `number \| 'auto'` | `1` | How many grid columns this slot spans |
| `class` | `string` | — | Additional CSS classes |
| `children` | `Snippet` | — | The widget to render inside |

`slotId` and `itemId` are required rather than optional. This was a deliberate design choice — even if drag-and-drop is not yet active, every slot must be identifiable for serialization (saving/restoring layout state) and potential future Muuri integration.

## Span Logic

```svelte
const spanStyle = $derived(
  span === 'auto' ? '' : `grid-column: span ${span}`
);
```

When `span === 'auto'`, no inline style is applied and the grid algorithm decides the column span naturally. For numeric spans, `grid-column: span N` forces the cell to occupy N columns. This allows wide widgets (charts, tables) to span multiple columns in a single-row layout without restructuring the grid.

## Overflow Prevention: min-width / min-height

```css
.rdash-slot {
  min-width: 0;
  min-height: 0;
}
```

This is a critical defensive CSS pattern. CSS grid cells have `min-width: auto` by default, which means a cell expands to fit its content rather than being constrained by the grid column width. If a widget renders a wide table or an unbreaking string, it will blow out the column and push adjacent cells out of the grid.

Setting `min-width: 0` forces the cell to respect the column boundary, allowing children to overflow internally (with `overflow: hidden` or scroll on the child) rather than breaking the parent grid.

## Inner Wrapper Div

The children are wrapped in a second `<div>` inside `.rdash-slot`:

```svelte
<div class={cn('rdash-slot', className)} style={spanStyle}>
  <div>
    {@render children?.()}
  </div>
</div>
```

The inner div acts as a stacking context and ensures widget children fill the slot uniformly. Without it, a widget that uses `height: 100%` would compute against the grid cell rather than the immediate parent, causing inconsistent sizing across different widget types.

## Known Gaps

- `slotId` and `itemId` are stored as props but not used for any behavior in this component. They appear to be reserved for a future drag-and-drop serialization layer that has not yet been implemented.
- No `rowSpan` prop exists. Widgets that need to span multiple rows must use raw style overrides.