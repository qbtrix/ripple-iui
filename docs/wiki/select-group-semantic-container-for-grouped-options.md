---
{
  "title": "Select Group — Semantic Container for Grouped Options",
  "summary": "A minimal wrapper around bits-ui's `SelectPrimitive.Group` that applies consistent internal padding and scroll margins, acting as the ARIA grouping container that associates a heading label with its child options. It renders no visual chrome beyond spacing.",
  "concepts": [
    "select group",
    "ARIA group",
    "scroll-my",
    "scroll margin",
    "p-1 padding",
    "option grouping",
    "bits-ui SelectGroup",
    "keyboard navigation",
    "scrollIntoView",
    "data-slot"
  ],
  "categories": [
    "widget",
    "form",
    "layout"
  ],
  "source_docs": [
    "811113866abdcd1e"
  ],
  "backlinks": null,
  "word_count": 353,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`select-group.svelte` is the structural grouping container for related select options. It renders an ARIA group container that screen readers use to announce the group label before its options, improving navigation in long option lists.

## Why Grouping Exists

Without grouping, a long select list forces users to scan every option linearly. Grouping creates meaningful sections — "Programming Languages", "Frameworks", "Tools" — that help users navigate directly to the relevant cluster. Screen readers announce the group heading when the user enters the group, providing orientation without requiring them to read every option.

At the DOM level, the bits-ui primitive renders the group with appropriate ARIA attributes that establish the heading-to-options relationship (typically via `aria-labelledby` pointing to the `GroupHeading` element's ID).

## Component Structure

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SelectPrimitive.GroupProps = $props();
</script>

<SelectPrimitive.Group
  bind:ref
  data-slot="select-group"
  class={cn("scroll-my-1 p-1", className)}
  {...restProps}
/>
```

## Styling Rationale

- **`p-1`** — 4px padding inside the group creates visual separation from adjacent groups or items, making the boundary between sections perceivable.
- **`scroll-my-1`** — when the user keyboard-navigates to the first option in this group, the viewport scrolls so there is 4px of visible space above the group, preventing the first item from appearing clipped at the top of the visible area.

## `scroll-my-1` and Keyboard Navigation

The `scroll-my-1` class (Tailwind's `scroll-margin-y`) is a defensive measure for scroll snapping and programmatic scrolling scenarios. When the bits-ui primitive calls `scrollIntoView()` on a focused item, the scroll margin ensures the view scrolls slightly further than the minimum required to show the item — revealing context and preventing the item from appearing flush against the scrollable area's edge.

## Slot-Less Design

The component accepts no explicit children prop — it passes `...restProps` to the primitive, which handles children internally. This means the composition must be handled by placing `SelectGroupHeading` and `SelectItem` components directly as children in the template, not via a named slot.

## Known Gaps

No known gaps. The component correctly delegates all group behavior to the primitive.