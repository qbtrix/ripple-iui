---
title: Layout gotchas
description: Two traps in master-detail (list and detail) layouts, and the recipe that avoids both.
order: 1
---

Two traps bite when you build a master-detail layout, a list beside a detail panel. Both hit a real deployment.

## Independent column scroll needs a fixed height

A CSS grid's implicit row stays `max-content`, so `max-height` clips the box but the columns never scroll on their own: the whole page scrolls as one. To make a grid's columns scroll independently, set a fixed `height` and `overflow: hidden` on the grid, and `overflow-y: auto` and `min-height: 0` on each column.

`grid`, `flex` and `card` all accept a `style` record that is merged into the computed style (see `Grid.svelte`, `Flex.svelte` and `Card.svelte`), even though `style` is not listed in their props.

```jsonc
{
  "type": "grid",
  "props": {
    "columns": "320px 1fr",
    "gap": "0px",
    "style": { "height": "calc(100vh - 64px)", "overflow": "hidden" }
  },
  "children": [
    { "type": "flex", "props": { "direction": "column",
      "style": { "overflow-y": "auto", "min-height": "0" } }, "children": [ /* list */ ] },
    { "type": "flex", "props": { "direction": "column",
      "style": { "overflow-y": "auto", "min-height": "0" } }, "children": [ /* detail */ ] }
  ]
}
```

## master-detail can't take custom list cards

The [`master-detail`](/docs/widgets/master-detail) widget gives you scroll and a sticky detail for free. Its list pane and detail pane are each `overflow-auto`, so the columns scroll independently with no extra CSS, and its `detail` prop takes a full custom spec for a rich detail panel.

Its list items are not templatable, though. You only get `valueKey`, `labelKey`, `descriptionKey` and `badgeKey`. The moment you want a bespoke list card (a score ring, custom badges), `master-detail` can't express it. Use it when the list items are simple. For custom list cards, hand-roll a grid and apply the fixed-height recipe above. A hand-rolled master-detail with no bounded height scrolls as one page, which is the first trap again.
