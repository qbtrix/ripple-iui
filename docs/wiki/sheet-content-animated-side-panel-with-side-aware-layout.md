---
{
  "title": "Sheet Content — Animated Side Panel with Side-Aware Layout",
  "summary": "The core panel component of the Sheet system that renders a fixed-position drawer sliding in from any of the four viewport edges. It composes the portal, overlay, and close button into a single cohesive unit and applies side-aware entrance/exit animations via data attributes.",
  "concepts": [
    "sheet content",
    "side panel",
    "slide animation",
    "data-open animation",
    "data-closed animation",
    "data-side attribute",
    "SheetPortal composition",
    "SheetOverlay",
    "showCloseButton",
    "size prop",
    "bits-ui child snippet"
  ],
  "categories": [
    "widget",
    "overlay",
    "animation",
    "sheet"
  ],
  "source_docs": [
    "905d3b268495adf7"
  ],
  "backlinks": null,
  "word_count": 686,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SheetContent` is the primary visual component in the Sheet system. It renders the floating panel itself — the container that slides in from the top, right, bottom, or left edge of the screen. It internally composes `SheetPortal`, `SheetOverlay`, and an optional close button, so callers only need to pass content children, a side and, for a wide left or right sheet, a size.

## Side Variants

```typescript
export type Side = "top" | "right" | "bottom" | "left";
```

The `side` prop (default: `"right"`) controls both the panel's position and its animation direction:

| Side | Position | Width/Height | Enter animation | Exit animation |
|---|---|---|---|---|
| `right` | `inset-y-0 right-0` | `w-3/4 h-full` | `slide-in-from-right-10` | `slide-out-to-right-10` |
| `left` | `inset-y-0 left-0` | `w-3/4 h-full` | `slide-in-from-left-10` | `slide-out-to-left-10` |
| `bottom` | `inset-x-0 bottom-0` | `h-auto w-full` | `slide-in-from-bottom-10` | `slide-out-to-bottom-10` |
| `top` | `inset-x-0 top-0` | `h-auto w-full` | `slide-in-from-top-10` | `slide-out-to-top-10` |

All of this is achieved with Tailwind's `data-[side=...]` attribute selectors. No JavaScript branching; the CSS does all the work based on the `data-side` attribute set on the element.

## Animation Architecture

bits-ui's Dialog primitive sets `data-open` and `data-closed` attributes on the content element during state transitions. Ripple maps these to Tailwind animation utilities:

- **Enter**: `data-open:animate-in data-open:fade-in-0`
- **Exit**: `data-closed:animate-out data-closed:fade-out-0`
- **Direction**: Combined with `data-[side=...]` for directional slide

The `duration-200 ease-in-out` transition applies to all sides. This CSS-only approach means animations work without a JavaScript animation library and respect `prefers-reduced-motion` if that is configured in the animation utilities.

## Internal Composition

```svelte
<SheetPortal {...portalProps}>
  <SheetOverlay />
  <SheetPrimitive.Content ...>
    {@render children?.()}
    {#if showCloseButton}
      <SheetPrimitive.Close data-slot="sheet-close">
        {#snippet child({ props })}
          <Button variant="ghost" class="absolute top-3 right-3" size="icon-sm" {...props}>
            <XIcon />
            <span class="sr-only">Close</span>
          </Button>
        {/snippet}
      </SheetPrimitive.Close>
    {/if}
  </SheetPrimitive.Content>
</SheetPortal>
```

The close button uses bits-ui's `child` snippet pattern — a render prop that gives the Button component full control over the DOM element while still wiring up the close behavior from `SheetPrimitive.Close`. This is needed because `Button` must be the actual DOM element (not a wrapper around it) for proper focus management and ARIA role assignment.

## `showCloseButton` Prop

The built-in close button can be suppressed via `showCloseButton={false}`. This is useful for:

- Sheets where the header already contains a close control
- Bottom sheets designed to be dismissed only via gesture/swipe (handled externally)
- Sheets in testing environments where the X button complicates snapshot tests

## `portalProps` Forwarding

The `portalProps` prop allows callers to configure the `SheetPortal` without needing to restructure the composition:

```svelte
<SheetContent portalProps={{ to: "#my-custom-mount" }}>
```

This is a forward-compatibility escape hatch — most callers never need it, but it prevents blocking edge cases where the default portal mount target (`<body>`) is not appropriate.

## Fill and Edge

The panel fills with `bg-ripple-popover` (the host's layer-over-content token) and draws its edge with `ring-1 ring-ripple-border` alone. There are no per-side borders: a border plus the ring doubled the leading edge.

## `size` — the Width Cap

On screens wider than `sm` (640px), left and right sheets take `w-3/4` capped by `size`, which follows Tailwind's max-w scale:

| `size` | Cap |
|---|---|
| `sm` (default) | 24rem |
| `md` | 28rem |
| `lg` | 32rem |
| `xl` | 36rem |
| `2xl` | 42rem |
| `3xl` | 48rem |
| `4xl` | 56rem |

```svelte
<Sheet.Content side="right" size="3xl">…</Sheet.Content>
```

Each cap is a full literal class string in the component's `SIZE` map, so a consumer's Tailwind scan emits it. The element also carries `data-size`. A caller `class` with its own `data-[side=right]:sm:max-w-*` still replaces the cap, because `cn` runs twMerge. Top and bottom sheets are full width and ignore `size`. The `sheet` spec widget forwards the same prop.

## Screen Reader Close Label

`<span class="sr-only">Close</span>` inside the built-in close button provides an accessible label for screen readers. Without it, the button would be announced as an unlabeled button containing an SVG icon — a poor screen reader experience.

## Known Gaps

- `w-3/4` below the cap is fixed; `size` sets the cap, not the fraction.
- The `h-auto` for top/bottom sheets means the panel height is determined by content. Very tall content could overflow the viewport without a max-height constraint.
- No gesture/swipe-to-dismiss support — this is a known gap for mobile use cases.

## Summary

`SheetContent` packages the most complex part of the Sheet system into a clean API: a `side` prop, a `size` cap, an optional `showCloseButton`, passthrough `portalProps`, and a children slot. The CSS-only animation approach via `data-[side]` + `data-open/closed` keeps the component performant and dependency-free.