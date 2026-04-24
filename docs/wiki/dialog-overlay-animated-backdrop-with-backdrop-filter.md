---
{
  "title": "Dialog Overlay — Animated Backdrop with Backdrop Filter",
  "summary": "Wraps the bits-ui `DialogPrimitive.Overlay` to produce a full-viewport dimmed backdrop behind an open dialog. Applies entrance/exit animations and a conditional blur effect, with progressive enhancement for browsers that support the backdrop-filter CSS property.",
  "concepts": [
    "dialog overlay",
    "backdrop blur",
    "backdrop-filter",
    "animate-in",
    "animate-out",
    "data-open",
    "data-closed",
    "fixed positioning",
    "z-index isolation",
    "bits-ui",
    "Tailwind supports variant",
    "progressive enhancement"
  ],
  "categories": [
    "dialog",
    "animation",
    "ui-component"
  ],
  "source_docs": [
    "a064d8faf9f2c056"
  ],
  "backlinks": null,
  "word_count": 318,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DialogOverlay` renders the scrim that appears behind an open dialog panel. It serves two purposes: visual focus (directing the user's attention to the modal) and interaction isolation (though actual pointer-event blocking is handled by the bits-ui layer underneath).

## Animation

The overlay uses data-attribute-driven animation classes tied to the dialog's open/closed state:

```
data-open:animate-in data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0
duration-100
```

bits-ui toggles `data-open` and `data-closed` attributes on the overlay as the dialog transitions. The 100ms duration keeps the fade short — long enough to prevent a jarring snap, short enough to not feel sluggish.

## Backdrop Blur — Progressive Enhancement

```
supports-backdrop-filter:backdrop-blur-xs
```

The `supports-backdrop-filter:` variant is a Tailwind CSS feature query that only applies `backdrop-blur-xs` when the browser supports the CSS `backdrop-filter` property. This prevents layout or rendering breakage in older environments — without it, the blur class would either error or produce no effect, but with the guard in place the component degrades to a plain semi-transparent overlay (`bg-black/10`) on unsupported browsers.

Using `bg-black/10` (10% opacity black) rather than a heavier value keeps the content behind the dialog subtly readable, which is a deliberate UX choice: Ripple dialogs are informational overlays, not blocking modals that should completely obscure the background.

## Stacking and Isolation

```
fixed inset-0 isolate z-50
```

- **`fixed inset-0`** stretches the overlay to fill the entire viewport, regardless of scroll position.
- **`z-50`** places it above normal page content.
- **`isolate`** creates a new stacking context, preventing child elements from accidentally punching through or behind the overlay due to their own `z-index` values.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | bindable | Forwarded to `DialogPrimitive.Overlay` |
| `class` | `string` | Merged via `cn()` |
| `...restProps` | `DialogPrimitive.OverlayProps` | Full passthrough |

## Known Gaps

None identified. The `supports-backdrop-filter` guard is the main defensive pattern; the rest of the logic is delegated to bits-ui.