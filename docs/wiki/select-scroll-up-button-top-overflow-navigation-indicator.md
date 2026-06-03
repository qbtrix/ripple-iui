---
{
  "title": "Select Scroll Up Button — Top Overflow Navigation Indicator",
  "summary": "Renders a chevron-up affordance pinned to the top of a select listbox when hidden options exist above the visible scroll area. It is the symmetric counterpart to `SelectScrollDownButton`, completing the bidirectional scroll navigation pattern.",
  "concepts": [
    "scroll affordance",
    "ChevronUpIcon",
    "bidirectional scroll",
    "bits-ui ScrollUpButton",
    "WithoutChildrenOrChild",
    "top-0 positioning",
    "bg-popover",
    "data-slot",
    "IntersectionObserver",
    "icon size normalization"
  ],
  "categories": [
    "widget",
    "select",
    "scroll",
    "accessibility"
  ],
  "source_docs": [
    "f67d5e7c779b63d3"
  ],
  "backlinks": null,
  "word_count": 561,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SelectScrollUpButton` provides the upward scroll affordance for a select listbox. When a user has scrolled down into a long list, this component appears at the top of the dropdown to signal that more options exist above the current viewport. It is structurally identical to `SelectScrollDownButton` with the direction and icon inverted.

## Why Both Scroll Buttons Exist

A select list without top/bottom scroll affordances creates a discovery problem: once a user scrolls down, they may not realize they can scroll back up to see earlier options. The paired scroll buttons create a clear "you are in the middle of a list" mental model. bits-ui handles the visibility logic — each button only appears when there is overflow content in its direction.

## Implementation

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props();
</script>

<SelectPrimitive.ScrollUpButton
  bind:ref
  data-slot="select-scroll-up-button"
  class={cn(
    "bg-popover z-10 flex cursor-default items-center justify-center py-1",
    "[&_svg:not([class*='size-'])]:size-4 top-0 w-full",
    className
  )}
  {...restProps}
>
  <ChevronUpIcon />
</SelectPrimitive.ScrollUpButton>
```

## Structural Symmetry with Scroll Down Button

The only differences between this component and `SelectScrollDownButton` are:

| Property | Scroll Up | Scroll Down |
|---|---|---|
| Icon | `ChevronUpIcon` | `ChevronDownIcon` |
| Position class | `top-0` | `bottom-0` |
| Primitive | `ScrollUpButton` | `ScrollDownButton` |
| data-slot | `select-scroll-up-button` | `select-scroll-down-button` |

All styling classes, prop types, and behavioral patterns are identical. This symmetry is intentional and makes the two components easy to maintain together.

## Styling Details

- **`top-0 w-full`** — pins the button flush to the top of the listbox container at full width.
- **`bg-popover`** — opaque background matching the popover surface, so list items scroll under the affordance cleanly.
- **`z-10`** — ensures the button paints above scrolling list items.
- **`cursor-default`** — communicates scroll-area semantics rather than button semantics.
- **`py-1`** — vertical padding creates a comfortable hover/hold target zone.

## Icon Size Normalization

The class `[&_svg:not([class*='size-'])]:size-4` applies `size-4` to any SVG child that does not already have a size class. This prevents unintentionally large or small icons if the Lucide icon ships with its own intrinsic size. It is a defensive rule that works for any icon, not just `ChevronUpIcon`.

## bits-ui Visibility Contract

bits-ui controls when this button renders. It uses an IntersectionObserver or scroll event listener internally to track whether the list has content above the current scroll position. The Ripple wrapper does not need to manage show/hide logic — it only needs to provide the styled element that bits-ui mounts and unmounts.

## `data-slot` for CSS Targeting

The `data-slot="select-scroll-up-button"` attribute makes this element reliably selectable in stylesheets and tests without relying on fragile class-name coupling. Parent components can write rules like `[data-slot='select-scroll-up-button'] { ... }` to apply context-specific overrides.

## Known Gaps

- No aria label is applied to the scroll buttons. Screen readers relying on role and accessible name may not announce these affordances. bits-ui may handle this internally, but it is worth verifying.
- Scroll speed and threshold are not configurable from this wrapper.

## Summary

`SelectScrollUpButton` is the top counterpart to the scroll down affordance, completing the bidirectional overflow navigation pattern. It shares the same design language, props contract, and delegation architecture — keeping the select scroll UX consistent and the codebase DRY.