---
{
  "title": "Popover Content — Animated Floating Panel with Portal Integration",
  "summary": "Renders the floating panel of a popover inside a portal, with entrance/exit animations keyed to open/close state and configurable positioning. Automatically wraps content in `PopoverPortal` to escape ancestor stacking contexts.",
  "concepts": [
    "popover content",
    "portal integration",
    "sideOffset",
    "align prop",
    "directional animation",
    "RTL support",
    "z-index",
    "transform origin",
    "data-open",
    "data-closed",
    "slide-in animation",
    "zoom animation",
    "bits-ui Content"
  ],
  "categories": [
    "popover",
    "animation",
    "layout",
    "ui-component"
  ],
  "source_docs": [
    "b35f31ed2a7e0099"
  ],
  "backlinks": null,
  "word_count": 356,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`PopoverContent` is the visible panel that appears when a popover opens. It composes `PopoverPortal` with `PopoverPrimitive.Content`, handling the two concerns that every popover panel requires: DOM placement (via portal) and visual presentation (via animation and styling).

## Portal Integration

The content is always wrapped in `PopoverPortal`:

```svelte
<PopoverPortal {...portalProps}>
  <PopoverPrimitive.Content ... />
</PopoverPortal>
```

This is the same pattern used in `DialogContent` — escaping ancestor stacking contexts to prevent z-index conflicts. The `portalProps` prop allows the caller to configure the portal (e.g., a custom render target) without `PopoverContent` needing to expose every portal prop directly.

## Positioning Defaults

```svelte
let {
  sideOffset = 4,
  align = "center",
  ...
} = $props();
```

- **`sideOffset = 4`** — 4px gap between the trigger element and the popover panel. Without this, the panel would touch the trigger edge, which looks cramped and can interfere with click-outside detection at the boundary.
- **`align = "center"`** — the panel's alignment axis relative to the trigger. Callers can pass `"start"` or `"end"` to shift the panel left or right.

## Animation Classes

The class string uses data-attribute-driven Tailwind variants:

```
data-open:animate-in data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0
data-closed:zoom-out-95 data-open:zoom-in-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
```

The side-specific slide animations create a sense of physical origin: a popover opening below its trigger slides in from the top (i.e., from the trigger downward), which reads as the panel emerging from the trigger element rather than appearing from outside the viewport. This directional animation is a small but significant UX detail.

Two non-standard sides are also handled:
```
data-[side=inline-start]:slide-in-from-right-2
data-[side=inline-end]:slide-in-from-left-2
```
These support RTL (right-to-left) layouts where `inline-start` maps to the right in RTL mode.

## Visual Defaults

- **`w-72`** — 288px default width, sufficient for short descriptions and form controls
- **`ring-1 ring-foreground/10`** — subtle border via box-shadow ring, using 10% foreground opacity for a theme-adaptive edge
- **`z-50`** — above most page elements when portaled to body
- **`origin-(--transform-origin)`** — uses a CSS custom property for transform origin, which bits-ui sets dynamically based on which side the popover opens on, ensuring zoom animations scale from the correct anchor point

## Known Gaps

None identified.