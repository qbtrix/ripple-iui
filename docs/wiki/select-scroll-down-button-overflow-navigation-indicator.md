---
{
  "title": "Select Scroll Down Button — Overflow Navigation Indicator",
  "summary": "Renders a chevron-down affordance anchored to the bottom of a select listbox when the list overflows its container. It signals to the user that more options exist below the visible area and provides a scroll target managed by bits-ui.",
  "concepts": [
    "scroll affordance",
    "overflow indicator",
    "ChevronDownIcon",
    "bits-ui ScrollDownButton",
    "WithoutChildrenOrChild",
    "z-index layering",
    "bg-popover",
    "data-slot",
    "bindable ref",
    "cursor-default"
  ],
  "categories": [
    "widget",
    "select",
    "scroll",
    "accessibility"
  ],
  "source_docs": [
    "36b0be21130527f9"
  ],
  "backlinks": null,
  "word_count": 558,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

When a select dropdown contains more items than can fit in the constrained list height, users need a visual cue and a scroll mechanism. The `SelectScrollDownButton` addresses this by pinning a downward-pointing chevron to the bottom edge of the listbox. The button appears automatically when there is hidden content below and disappears once the user has scrolled to the end.

## Why This Component Exists

A plain scrollbar is easy to overlook and is often hidden on macOS and mobile by default. An explicit sticky affordance — a chevron arrow glued to the bottom of the list — ensures users discover the overflow without relying on system scrollbar visibility settings. This is especially important in AI-generated interfaces where the option list length is dynamic and unpredictable.

## Implementation

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
</script>

<SelectPrimitive.ScrollDownButton
  bind:ref
  data-slot="select-scroll-down-button"
  class={cn(
    "bg-popover z-10 flex cursor-default items-center justify-center py-1",
    "[&_svg:not([class*='size-'])]:size-4 bottom-0 w-full",
    className
  )}
  {...restProps}
>
  <ChevronDownIcon />
</SelectPrimitive.ScrollDownButton>
```

## Key Design Decisions

### `WithoutChildrenOrChild` Type Guard

The props type explicitly excludes `children` and `child` from the allowed prop set. This prevents callers from accidentally providing slot content that would replace the chevron. The icon is hardcoded intentionally — the scroll button should always render the same affordance regardless of application context.

### `cursor-default`

The cursor is set to `default` (arrow), not `pointer`. This communicates to the user that the element is not a standard clickable button but rather an area they can hover over or hold to scroll. It matches the UX convention for scroll affordances used in macOS menus and native select elements.

### `z-10` Stacking

The `z-10` class ensures the button visually overlaps list items as they scroll beneath it. Without this, items near the bottom of the list would paint on top of the button, obscuring it.

### `bg-popover` Background

Using `bg-popover` (rather than transparent) creates a fade-behind effect where list content is hidden under the button as items scroll under it. This visually separates the scroll control from the list content and reinforces that more items exist below.

### `bottom-0 w-full` Positioning

The `bottom-0` and `w-full` classes anchor the button to the full width of the listbox bottom. bits-ui handles the actual `position: sticky` or `position: absolute` behavior via `ScrollDownButton`.

## `bind:ref` Pattern

The `ref` prop uses Svelte 5's `$bindable()` default, allowing parent components to hold a direct reference to the underlying DOM element. This is used for programmatic focus management or scroll measurement when needed.

## `data-slot` Attribute

The `data-slot="select-scroll-down-button"` attribute is a Ripple convention for CSS targeting and component introspection. Stylesheet rules or test selectors can reliably target this element without coupling to class names.

## Known Gaps

- The scroll speed when holding the button is controlled entirely by bits-ui and is not configurable from this wrapper.
- There is no loading or disabled state variant; if the select is in a disabled state the button will still render but interaction is blocked by the parent primitive.

## Summary

`SelectScrollDownButton` is a styled affordance component that improves overflow discoverability in long select lists. Its minimal surface area and hardcoded icon keep the scroll UX consistent across all select usages in Ripple.