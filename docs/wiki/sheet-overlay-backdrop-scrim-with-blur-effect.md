---
{
  "title": "Sheet Overlay — Backdrop Scrim with Blur Effect",
  "summary": "Renders a semi-transparent backdrop behind an open sheet panel that blocks interaction with underlying page content and provides a subtle blur effect when the browser supports it. It is always rendered inside `SheetContent` and delegates close-on-click behavior to bits-ui's `Dialog.Overlay`.",
  "concepts": [
    "sheet overlay",
    "backdrop blur",
    "backdrop-filter progressive enhancement",
    "fixed inset-0",
    "z-50 stacking",
    "bg-black/10",
    "Dialog.Overlay",
    "close-on-click",
    "supports-backdrop-filter",
    "bits-ui"
  ],
  "categories": [
    "widget",
    "overlay",
    "animation",
    "sheet"
  ],
  "source_docs": [
    "39517639f2e59c86"
  ],
  "backlinks": null,
  "word_count": 654,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet Overlay is the dark semi-transparent backdrop that appears behind an open sheet panel. It serves two critical UX functions: it visually focuses attention on the sheet by dimming the background, and it provides an intuitive click target — clicking the overlay dismisses the sheet. bits-ui's `Dialog.Overlay` primitive wires up the close-on-click behavior automatically.

## Implementation

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.OverlayProps = $props();
</script>

<SheetPrimitive.Overlay
  bind:ref
  data-slot="sheet-overlay"
  class={cn(
    "bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50",
    className
  )}
  {...restProps}
/>
```

## Styling Decisions

### `bg-black/10` — Subtle Dimming

A 10% black opacity is deliberately light. This is a sheet panel, not a full modal dialog. Sheets are used for drawer-style navigation, settings panels, and side-by-side content — contexts where the user is aware of and may want to reference the background content. A heavy dimming (`bg-black/50` or higher) would be too modal for this interaction pattern.

### `supports-backdrop-filter:backdrop-blur-xs`

This is a progressive enhancement:

- **On browsers with `backdrop-filter` support** — a very subtle blur (`backdrop-blur-xs`) is applied to the background behind the overlay, creating a frosted-glass effect.
- **On browsers without support** — the `supports-backdrop-filter:` prefix means the blur class is simply not applied. The overlay falls back gracefully to the plain `bg-black/10` treatment.

This pattern prevents the `backdrop-filter` from being applied in unsupported environments where it could produce rendering artifacts or be silently ignored in ways that break layout.

### `fixed inset-0`

The overlay must cover the entire viewport regardless of scroll position. `fixed inset-0` achieves this: `fixed` removes the element from normal flow and anchors it to the viewport; `inset-0` expands it to cover all four edges.

### `z-50`

The overlay stacks above all normal page content (`z-50 = 50` in Tailwind's default scale). The sheet content itself also uses `z-50` but renders after the overlay in DOM order, so it paints on top of the overlay. The stacking order is:

```
Normal page content (z: auto)
└── Overlay (z-50)
    └── Sheet panel (z-50, later in DOM → renders above)
```

## Close-on-Click Behavior

bits-ui's `Dialog.Overlay` registers a click handler that calls the dialog's `close()` method when the overlay is clicked. This is the standard pattern for dismissing a sheet by clicking outside the panel. The behavior is automatic — no `onclick` handler is needed in the Ripple wrapper.

To disable close-on-click for a sheet that should require explicit button interaction (e.g., a form that must be saved before closing), pass `closeOnOutsideClick={false}` to the `SheetRoot` or `SheetContent`, not to the overlay directly.

## Placement Inside SheetContent

The overlay is always rendered inside `SheetContent` — not as a separate sibling in the consumer's markup:

```svelte
<SheetPortal>
  <SheetOverlay />  <!-- always present inside SheetContent -->
  <SheetPrimitive.Content ...>
    ...
  </SheetPrimitive.Content>
</SheetPortal>
```

This makes the overlay an implementation detail of the content component. Consumers never need to include `<SheetOverlay>` manually; it is always present when the sheet is open. However, the component is exported from `index.ts` so consumers can customize or replace it if needed.

## `bind:ref` for Testing

The `ref` binding gives test code direct access to the overlay DOM element, enabling assertions like:

```typescript
expect(overlayRef).toHaveClass('fixed');
```

## Known Gaps

- The overlay `z-index` is hardcoded as `z-50`. If the application uses `z-50` for other elements (e.g., a sticky header), the overlay may appear beneath them. There is no `zIndex` prop to customize this without using `className`.
- No animation classes are applied to the overlay itself. The overlay appears and disappears instantly. Adding `animate-in fade-in-0` / `animate-out fade-out-0` via bits-ui's `data-open/data-closed` attributes would match the sheet panel's fade behavior.

## Summary

`SheetOverlay` is a minimal but purposeful component. Its `supports-backdrop-filter` progressive enhancement, deliberate `bg-black/10` opacity choice, and automatic close-on-click via bits-ui make it a complete backdrop solution that works correctly across all modern browsers and gracefully degrades on older ones.