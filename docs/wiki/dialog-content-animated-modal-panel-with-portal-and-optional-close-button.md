---
{
  "title": "Dialog Content — Animated Modal Panel with Portal and Optional Close Button",
  "summary": "DialogContent assembles the visible dialog panel. It wraps children in a portal (for z-index and stacking context isolation), renders the background overlay, and optionally includes an `X` close button in the top-right corner. Enter/exit animations are driven by bits-ui's `data-open`/`data-closed` attributes.",
  "concepts": [
    "dialog-content",
    "DialogPortal",
    "stacking context",
    "overflow clipping",
    "bits-ui animations",
    "data-open/data-closed",
    "CSS centering",
    "responsive width",
    "showCloseButton",
    "sr-only"
  ],
  "categories": [
    "widget",
    "dialog",
    "layout"
  ],
  "source_docs": [
    "8a501958eb669169"
  ],
  "backlinks": null,
  "word_count": 408,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`dialog-content.svelte` is the primary composition layer of the dialog system. It coordinates three concerns: portal teleportation, overlay rendering, and the content panel itself — combining them into a single ergonomic component that hides this complexity from consumers.

## Portal Architecture

```svelte
<DialogPortal {...portalProps}>
  <Dialog.Overlay />
  <DialogPrimitive.Content ...>
    ...
  </DialogPrimitive.Content>
</DialogPortal>
```

The `DialogPortal` teleports its children to the `<body>` element (or a designated portal target). This is critical for two reasons:

1. **Stacking contexts** — A dialog inside a `position: relative` ancestor would have its `z-index: 50` clipped by the ancestor's stacking context. Portaling to `<body>` bypasses all intermediate stacking contexts.
2. **Overflow clipping** — Parent containers with `overflow: hidden` would clip a dialog positioned inside them. Portal placement ensures dialogs always appear above all other content.

The `portalProps` pass-through allows consumers to customize portal behavior (e.g. targeting a specific mount point) without changing the component itself.

## Animation System

```
data-open:animate-in data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0
data-closed:zoom-out-95 data-open:zoom-in-95
duration-100
```

bits-ui sets `data-open` when the dialog enters and `data-closed` when it exits. Tailwind's `data-*:` variant applies the corresponding animation classes. The combined fade + zoom creates a polished scale-in/out effect. `duration-100` keeps the animation snappy — long enough to be perceived as intentional, short enough not to feel sluggish.

## Centered Positioning

```
fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2
```

The classic CSS centering technique for modals: fixed positioning at 50%/50%, then negative translate by 50% of the element's own dimensions. This centers the dialog regardless of its content size, without requiring JavaScript measurements.

## Responsive Width

```
max-w-[calc(100%-2rem)] sm:max-w-sm
```

On small screens, the dialog uses full viewport width minus `2rem` margin on each side. At `sm` breakpoint and above, it caps at `max-w-sm` (384px). This prevents the dialog from spanning the full viewport on tablets while ensuring usability on small phones.

## Optional Close Button

```svelte
{#if showCloseButton}
  <DialogPrimitive.Close data-slot="dialog-close">
    {#snippet child({ props })}
      <Button variant="ghost" class="absolute top-2 right-2" size="icon-sm" {...props}>
        <XIcon />
        <span class="sr-only">Close</span>
      </Button>
    {/snippet}
  </DialogPrimitive.Close>
{/if}
```

`showCloseButton` defaults to `true` — most dialogs should have a visible close affordance. The `sr-only` span provides screen reader text for the icon-only button. The `child` snippet pattern gives bits-ui control over the close trigger props while allowing full visual customization.

## Known Gaps

None identified. The `showCloseButton` escape hatch handles cases where the dialog is intentionally uncloseable (e.g. forced action dialogs) or where a custom close UI is embedded in the dialog body.
