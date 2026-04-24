---
{
  "title": "Tooltip Content Bubble with Arrow and Animations",
  "summary": "The visible tooltip bubble component, composing portal rendering, directional entry/exit animations, keyboard shortcut badge support, and a custom arrow indicator. Delegates positioning and accessibility to `bits-ui`'s Tooltip.Content primitive.",
  "concepts": [
    "tooltip content",
    "portal",
    "animation",
    "data-state",
    "animate-in",
    "animate-out",
    "arrow indicator",
    "transform origin",
    "keyboard shortcut",
    "kbd slot",
    "side offset",
    "placement",
    "bits-ui",
    "Svelte snippet"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "accessibility"
  ],
  "source_docs": [
    "c23991f352bdce7d"
  ],
  "backlinks": null,
  "word_count": 495,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TooltipContent` is the most feature-rich component in the tooltip system. It handles the visible tooltip bubble, entry/exit animations, arrow positioning across four directions, keyboard shortcut display support, and portal rendering. All ARIA relationships and positioning calculations are handled by `bits-ui`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable DOM reference |
| `class` | `string` | — | Extra classes |
| `sideOffset` | `number` | `0` | Gap between tooltip and trigger |
| `side` | `string` | `"top"` | Preferred placement direction |
| `children` | snippet | — | Tooltip text or content |
| `arrowClasses` | `string` | — | Extra classes on the arrow element |
| `portalProps` | `WithoutChildrenOrChild<ComponentProps<typeof TooltipPortal>>` | — | Props forwarded to the portal wrapper |
| `...restProps` | `TooltipPrimitive.ContentProps` | — | All bits-ui Content props |

## Portal Wrapping

The component immediately wraps everything in `<TooltipPortal>`. This is not optional — the portal is always active. Without it, tooltip bubbles rendered inside `overflow: hidden` containers would be clipped. The `portalProps` prop allows consumers to customize the portal target (e.g., render into a specific container rather than `document.body`) without forking the component.

## Entry/Exit Animations

The class string includes a full set of data-state-driven animations:

- `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` — Fade and zoom in on open.
- `data-[state=delayed-open]:animate-in ...` — Same animation for delayed opens (after hover delay).
- `data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95` — Fade and zoom out on close.
- `data-[side=bottom]:slide-in-from-top-2` etc. — Directional slide-in that makes the bubble appear to emerge from the trigger's edge. Each of the four sides has its own entrance direction.

These use Tailwind's `animate-in`/`animate-out` utilities (from `tailwindcss-animate`) keyed to `bits-ui`'s data attributes, keeping all animation logic in CSS without JavaScript timers.

## Arrow Indicator

The `bits-ui` `TooltipPrimitive.Arrow` provides the positioning anchor; ripple replaces the default SVG arrow with a custom `<div>` via the `child` snippet:

```svelte
<TooltipPrimitive.Arrow>
  {#snippet child({ props })}
    <div class={cn("size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground ...", arrowClasses)} {...props}></div>
  {/snippet}
</TooltipPrimitive.Arrow>
```

The rotated square div creates a CSS diamond/arrow shape. Per-side transform overrides adjust the position precisely for each placement direction, compensating for the visual offset that the rotation introduces.

## Keyboard Badge Support

`has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm` — If the tooltip content contains a `<kbd>` element with `data-slot="kbd"`, additional padding and layering is applied automatically. This supports showing keyboard shortcut hints inside tooltips without requiring extra wrapper divs.

## Transform Origin

`origin-(--bits-tooltip-content-transform-origin)` — The zoom animations use a CSS custom property injected by `bits-ui` to set the transform origin to the point closest to the trigger. This makes the tooltip appear to scale out from the trigger rather than from its own center.

## Known Gaps

No TODO or FIXME markers. The `sideOffset` default of `0` means the tooltip bubble sits flush against the trigger by default, which may feel cramped. Most usage patterns will want `sideOffset={4}` or similar.