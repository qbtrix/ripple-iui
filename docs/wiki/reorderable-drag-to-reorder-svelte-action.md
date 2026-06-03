---
{
  "title": "Reorderable — Drag-to-Reorder Svelte Action",
  "summary": "The `reorderable` Svelte action attaches zero-dependency pointer-event drag-and-drop reordering to any container element, supporting grid, masonry, and flex layouts. It uses a ghost element for visual drag feedback, a configurable dead zone to prevent accidental drags, and nearest-edge drop detection with a maximum proximity threshold.",
  "concepts": [
    "Svelte action",
    "drag-and-drop",
    "Pointer Events API",
    "pointer capture",
    "ghost element",
    "dead zone",
    "drop target",
    "nearest-edge detection",
    "reorderable",
    "ReorderableOptions",
    "flip animation",
    "container reorder"
  ],
  "categories": [
    "actions",
    "layout",
    "interaction"
  ],
  "source_docs": [
    "37856f3c648bf548"
  ],
  "backlinks": null,
  "word_count": 622,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`reorderable` is a Svelte action that turns any container into a drag-to-reorder list without external drag-and-drop libraries. It uses the browser's Pointer Events API (which unifies mouse, touch, and stylus input) and pointer capture to track drags reliably even when the pointer leaves the container.

## Usage

```svelte
<div use:reorderable={{ items, onReorder, handle: '[data-grip]', debug: true }}>
  {#each items as item (item.id)}
    <div data-reorder-id={item.id} animate:flip>
      <button data-grip>⠿</button>
    </div>
  {/each}
</div>
```

Each direct child must carry a `data-reorder-id` attribute matching an item's `id`. The action reads these IDs to build a positional snapshot and compute the new order on drop.

## ReorderableOptions

| Option | Type | Purpose |
|--------|------|---------|
| `items` | `{ id: string }[]` | Current ordered array; provides the canonical ID list for reorder computation |
| `onReorder` | `(ids: string[]) => void` | Callback receiving the new ordered ID array after a successful drop |
| `handle` | `string` | Optional CSS selector; drag only initiates from matching elements |
| `debug` | `boolean` | Logs drag lifecycle events to console |

## Core Mechanics

### Dead Zone
The drag doesn't start on `pointerdown` — it starts only after the pointer moves more than `DEAD_ZONE` (5px) in any direction. This prevents single clicks on draggable items from accidentally initiating a drag, which is particularly important for interactive children like buttons.

### Ghost Element
When the dead zone is exceeded, a clone of the source element is appended to `document.body` as a fixed-position ghost. The original element is dimmed to 20% opacity. The ghost follows the pointer exactly (offset-corrected from where the pointer first hit the element), giving a natural "picking up" feel. On drop or cancel, the ghost fades out and shrinks over 120ms via a CSS transition before being removed.

### Rect Snapshot
`snapshotRects()` is called once at drag start — not continuously. This means the drop target calculation uses the layout positions at the moment dragging began. This is intentional: recalculating on every `pointermove` would cause layout thrash. The tradeoff is that if items animate during the drag (e.g., from a previous `animate:flip`), the ghost may drift from the visual layout slightly.

### Drop Target Detection
`findDropTarget` uses a bounding-box distance formula: it finds the element whose bounding rect is geometrically closest to the current pointer position, ignoring the source element itself. If the closest element is farther than `MAX_DROP_DISTANCE` (150px), no drop target is registered. This prevents cross-container drops from accidentally landing items in the wrong list.

### Pointer Capture
`container.setPointerCapture(e.pointerId)` is called on `pointerdown`. Pointer capture routes all subsequent pointer events to the container even if the pointer leaves the window, preventing drag loss on fast pointer movement.

### Escape Key Cancel
A `keydown` listener on `document` handles `Escape` to cancel in-progress drags. The ghost is removed, the source element opacity is restored, and pointer capture is released via `container.releasePointerCapture`. The try/catch around `releasePointerCapture` prevents errors if capture was lost before the cancel (e.g., `pointercancel` on mobile).

## Svelte Action Lifecycle

The returned object includes:
- **`update(newOpts)`** — Replaces the internal options reference. Called by Svelte when reactive props change (e.g., when the items array grows). Does not interrupt an active drag.
- **`destroy()`** — Removes all event listeners and cleans up any lingering ghost. Called automatically when the element is unmounted.

## Known Gaps

- The rect snapshot is taken at drag start and not updated during the drag. Fast animations or dynamic inserts during a drag will produce stale drop targets.
- Touch scroll conflict: `e.preventDefault()` on `pointerdown` blocks scroll on touch devices when the pointer starts on a draggable item. There is no touch-action: pan-y fallback.
- No keyboard-accessible reordering path exists — the action is purely pointer-driven.