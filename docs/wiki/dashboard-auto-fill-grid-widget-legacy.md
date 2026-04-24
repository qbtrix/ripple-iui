---
{
  "title": "Dashboard Auto-Fill Grid Widget (Legacy)",
  "summary": "A legacy CSS grid layout widget that automatically fills columns based on a minimum width using `repeat(auto-fill, minmax(...))`. This component is the static, non-draggable predecessor to the Muuri-based `DashboardRenderer` and is retained for simpler use cases that do not need interactive reordering.",
  "concepts": [
    "CSS grid",
    "auto-fill",
    "minmax",
    "dashboard layout",
    "legacy",
    "DashboardRenderer",
    "Muuri",
    "Swapy",
    "responsive grid",
    "align-content",
    "DashboardSlot"
  ],
  "categories": [
    "layout",
    "widget",
    "dashboard"
  ],
  "source_docs": [
    "bbdbaf62a6e19cbb"
  ],
  "backlinks": null,
  "word_count": 349,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Dashboard` renders an auto-filling CSS grid that distributes children into as many columns as will fit given a minimum column width. It is the simplest full-width grid layout available in Ripple and requires no JavaScript beyond Svelte's template rendering.

## How Auto-Fill Works

```svelte
style="display:grid; grid-template-columns:repeat(auto-fill,minmax({columnMin},1fr)); gap:{gap};"
```

`repeat(auto-fill, minmax(columnMin, 1fr))` instructs the browser to create as many columns as will fit in the container without going below `columnMin` width. Any remaining space is distributed equally. The result is a responsive grid that reflows automatically as the container resizes — no JavaScript resize observers needed.

Default values:
- `columnMin = '240px'` — suitable for card-sized widgets
- `gap = '12px'` — matches the `compact` density of the `Card` widget

## The `align-content: start` Rule

The scoped `.rdash` style sets `align-content: start`. Without this, a grid with fewer items than columns will stretch rows to fill the container height — making a two-item grid look like it has enormous cards. `align-content: start` keeps rows their natural height.

## Legacy Status

The file header explicitly marks this as a legacy component:

> Note: Drag-to-swap (Swapy) removed. Use DashboardRenderer (Muuri) for interactive dashboards.

The original implementation included Swapy-based drag-to-swap. That was removed — likely because Swapy had dependency or behavior conflicts — and the interactive dashboard responsibility was moved to `DashboardRenderer`, which uses Muuri for drag-and-drop grid management.

`Dashboard` is retained because not every dashboard needs drag interactions. Static AI-generated layouts, read-only reporting views, and embedded panels use it without the overhead of the Muuri runtime.

## Relationship to DashboardSlot

`Dashboard` is the grid container; `DashboardSlot` is the individual cell wrapper. Slots carry `span` metadata and enforce `min-width: 0; min-height: 0` to prevent grid blowout from overflowing children.

## Known Gaps

- `columnMin` and `gap` accept raw CSS strings with no validation. Passing an invalid CSS value silently produces a broken layout.
- There is no `maxColumns` or `minColumns` constraint — the grid always fills as many columns as the container allows.
- The Swapy removal is noted in the comment but no migration path to `DashboardRenderer` is documented inline.