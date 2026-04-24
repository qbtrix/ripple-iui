---
{
  "title": "Select Content — Animated Floating Panel with Scroll Controls",
  "summary": "The floating content panel for the select dropdown, composing a portal, scroll buttons, a viewport, and animated entry/exit transitions. It defaults to preventing page scroll when open (`preventScroll = true`) and uses a 4px side offset from the trigger, with directional slide animations driven by `data-[side]` attributes.",
  "concepts": [
    "select content",
    "floating panel",
    "preventScroll",
    "directional animation",
    "CSS custom properties",
    "anchor dimensions",
    "SelectPortal",
    "SelectViewport",
    "scroll buttons",
    "data-side attributes"
  ],
  "categories": [
    "widget",
    "overlay",
    "animation"
  ],
  "source_docs": [
    "bf60b1185fbdf35e"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`select-content.svelte` is the most compositionally complex component in the select family. It assembles the visible dropdown panel by composing four lower-level components — `SelectPortal`, `SelectPrimitive.Content`, `SelectScrollUpButton`, and `SelectScrollDownButton` — plus a viewport layer that enables overflow scrolling.

## Component Composition Tree

```
SelectPortal (DOM escape hatch)
  └── SelectPrimitive.Content (floating panel, position + animation)
      ├── SelectScrollUpButton (appears when scroll-up available)
      ├── SelectPrimitive.Viewport (scrollable options container)
      │   └── {children} (slots for Group, Item, Separator)
      └── SelectScrollDownButton (appears when scroll-down available)
```

## Why `preventScroll = true` by Default

When a dropdown opens on a mobile device or a short viewport, the user might try to scroll inside the dropdown to find their option. Without `preventScroll`, that scroll gesture would also scroll the underlying page, causing the trigger element to move off-screen while the dropdown is still open — leaving a floating panel with no visual anchor. The `preventScroll` flag locks the body scroll for the duration the dropdown is open.

## Directional Slide Animations

The `data-[side]` attribute classes create slide-in animations that originate from the correct direction:

- `data-[side=bottom]:slide-in-from-top-2` — content appears below the trigger, slides down from above
- `data-[side=top]:slide-in-from-bottom-2` — content appears above the trigger, slides up from below
- `data-[side=left]:slide-in-from-right-2` and `data-[side=right]:slide-in-from-left-2` — for side-anchored dropdowns

This bidirectional animation is important for correct spatial perception: the content appears to emerge from its anchor point rather than appearing from a fixed direction regardless of position.

## Viewport CSS Variables

```svelte
<SelectPrimitive.Viewport
  class="h-(--bits-select-anchor-height) w-full min-w-(--bits-select-anchor-width) scroll-my-1"
>
```

The viewport dimensions reference CSS custom properties (`--bits-select-anchor-height`, `--bits-select-anchor-width`) injected by the bits-ui positioning engine. This ensures the dropdown viewport matches the trigger's dimensions exactly, preventing visual width jumps when the dropdown opens.

## Portal Props Pass-Through

The `portalProps` prop allows consumers to configure the portal layer independently — for example, targeting a specific container element or disabling portaling in test environments. This is exposed as a separate prop rather than mixed into `restProps` to avoid namespace collisions between `SelectPrimitive.Content` props and portal props.

## Props

- **`sideOffset`** (default `4`): Pixel gap between trigger and content panel.
- **`preventScroll`** (default `true`): Lock body scroll while dropdown is open.
- **`portalProps`**: Configuration forwarded to `SelectPortal`.
- **`ref`**, **`class`**, **`children`**, **`...restProps`**: Standard Ripple prop surface.

## Known Gaps

No known gaps. The `preventScroll` default is opinionated but appropriate for most use cases.