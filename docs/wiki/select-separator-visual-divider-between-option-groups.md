---
{
  "title": "Select Separator — Visual Divider Between Option Groups",
  "summary": "A horizontal rule that visually segments groups of options inside a select dropdown. It reuses the shared Separator primitive with select-specific margins so dividers align flush with the popover edges.",
  "concepts": [
    "separator",
    "option grouping",
    "hr element",
    "bits-ui Separator",
    "negative margin bleed",
    "pointer-events-none",
    "bg-border design token",
    "data-slot",
    "ARIA role separator",
    "listbox structure"
  ],
  "categories": [
    "widget",
    "select",
    "layout",
    "accessibility"
  ],
  "source_docs": [
    "57a89082567aecc5"
  ],
  "backlinks": null,
  "word_count": 610,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SelectSeparator` renders a thin horizontal line inside a select listbox to divide logically related groups of options. Without visible grouping, long select lists become cognitively overwhelming — a separator gives users a clear visual break that communicates "these options belong to a different category."

## Why Not Use `<hr>` Directly

A raw `<hr>` element carries browser-default styling (`border-style`, `color`, `height`) that varies across platforms and is difficult to normalize cleanly with Tailwind. More importantly, a bare `<hr>` inside a listbox can confuse assistive technologies about the list's item structure. The bits-ui `Separator` primitive applies the correct ARIA role (`separator`) and semantic attributes so screen readers understand the divider is decorative structure, not a selectable item.

Ripple goes one step further by routing through its own `Separator` component (from `$lib/components/ui/separator/index.js`) rather than directly using `SeparatorPrimitive`. This means the separator inherits any future global style changes applied to the Separator component — the select dropdown stays in sync automatically.

## Implementation

```svelte
<script lang="ts">
  import type { Separator as SeparatorPrimitive } from "bits-ui";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<Separator
  bind:ref
  data-slot="select-separator"
  class={cn("bg-border -mx-1 my-1 h-px pointer-events-none", className)}
  {...restProps}
/>
```

## Styling Breakdown

### `-mx-1` — Negative Horizontal Margin

The popover content area applies `px-1` (4px horizontal padding) to its items. A separator inside that padding would be narrower than the full popover width by 8px total — visually floating in the middle rather than spanning edge to edge. `-mx-1` compensates for the parent padding so the separator bleeds to the full width of the popover panel.

### `my-1` — Vertical Breathing Room

A single `my-1` (4px top and bottom) provides just enough vertical space so the separator doesn't feel glued to adjacent options. It matches the vertical rhythm of the list without adding excessive whitespace.

### `h-px` — 1px Height

A 1px line is the thinnest visible separator. Thicker dividers would visually compete with the option items themselves. On high-DPI displays this renders as a crisp half-pixel-equivalent line.

### `pointer-events-none`

This is a defensive guard against accidental interaction. Without it, a user clicking or dragging near the separator boundary could trigger hover or focus events on the separator element. Since separators are purely decorative structure, blocking all pointer events prevents unexpected UX edge cases.

### `bg-border`

Using the `border` design token (rather than a hardcoded color) means the separator automatically adapts to light/dark mode and any theme overrides applied to the border color in the design system.

## Props Contract

Props are typed as `SeparatorPrimitive.RootProps`, which includes:

- **`orientation`** — `"horizontal"` (default) or `"vertical"`. In select contexts only horizontal makes sense, but the underlying primitive supports both.
- **`decorative`** — When `true`, the ARIA `separator` role is omitted for elements that are purely visual. The bits-ui primitive defaults to `true` for decorative use.

## `data-slot` Convention

`data-slot="select-separator"` marks this element for Ripple's CSS targeting system. It also distinguishes a select-specific separator from a generic `Separator` usage elsewhere in the page, enabling context-specific style overrides.

## Known Gaps

- The `orientation` prop is forwarded but a vertical separator inside a select dropdown has no defined use case in Ripple and would likely produce broken layout.
- No labeled group support: the separator is purely visual. For full accessibility, grouped options should also use `aria-labelledby` via `SelectGroup` and `SelectGroupLabel` components (separate from this file).

## Summary

`SelectSeparator` is a small but purposeful component that routes the shared Separator primitive through select-specific spacing rules. Its `-mx-1` bleed and `pointer-events-none` guard are the two design details that make it correct for this context.