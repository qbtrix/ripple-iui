---
{
  "title": "Card Action — Grid-Positioned Action Slot in Card Header",
  "summary": "CardAction is a specialised layout sub-component that places action controls (buttons, menus) in the top-right corner of a card header using CSS grid positioning. It uses explicit grid coordinates to float above card title and description content without affecting their flow.",
  "concepts": [
    "card action",
    "CSS grid placement",
    "col-start",
    "row-span",
    "card header",
    "action slot",
    "grid layout",
    "WithElementRef",
    "data-slot",
    "Svelte 5"
  ],
  "categories": [
    "widget",
    "card",
    "layout"
  ],
  "source_docs": [
    "032220a0e351eac6"
  ],
  "backlinks": null,
  "word_count": 411,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Cards frequently need an action control in their top-right area — a three-dot menu, a close button, or a settings icon. Without a dedicated component, developers implement this with absolute positioning or flexbox spacers, both of which break in edge cases (absolute positioning pulls the element out of grid flow; flexbox spacers do not handle multi-line titles gracefully).

`card-action.svelte` solves this by using explicit CSS grid placement to position the action in the correct cell of the card header grid.

## Grid Positioning

The core of this component is four CSS classes:

```
col-start-2 row-span-2 row-start-1 self-start justify-self-end
```

- `col-start-2` — places the action in the second column of the card header grid
- `row-start-1` — anchors it to the first row (top of the header)
- `row-span-2` — spans both the title row and the description row, keeping the action vertically centered against both
- `self-start justify-self-end` — aligns to top-right within its cell

This assumes the parent card header defines a two-column CSS grid where column 1 holds the title/description content and column 2 is reserved for actions. The action component does not define the grid itself — it only participates in one that the card header creates.

## Why Grid Over Flexbox

If the card header used flexbox with `justify-content: space-between`, a long title would push the action element down when the title wraps to multiple lines. With a grid layout, the title and description stack vertically in column 1 while the action lives independently in column 2 — never displaced by title length.

## Rendering Behavior

```svelte
<div
  bind:this={ref}
  data-slot="card-action"
  class={cn("cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

The `cn-card-action` class is a semantic CSS identifier rather than a utility class — it exists for external CSS overrides and for Ripple's generative UI runtime to target card action slots by name.

## Props

The component accepts the standard `WithElementRef<HTMLAttributes<HTMLDivElement>>` pattern — ref binding plus full HTML attribute pass-through. This allows consumers to attach event handlers, ARIA roles, or data attributes directly to the action container.

## Usage Example

```svelte
<Card>
  <CardHeader>
    <CardTitle>Project Alpha</CardTitle>
    <CardDescription>Quarterly review dashboard</CardDescription>
    <CardAction>
      <DropdownMenu />
    </CardAction>
  </CardHeader>
</Card>
```

## Known Gaps

The grid positioning assumes the parent card header provides a specific two-column grid. If `CardAction` is used outside of a `CardHeader`, the grid placement classes will be silently ignored and the element will render in normal flow — no error, but incorrect positioning.