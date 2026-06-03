---
{
  "title": "Sheet Close — Accessible Panel Dismiss Button",
  "summary": "A minimal passthrough to bits-ui's `Dialog.Close` primitive that renders a dismiss button inside a sheet panel. It wires up the accessibility contract for closing the sheet via keyboard or click without requiring application-level event handling.",
  "concepts": [
    "sheet close",
    "dialog primitive",
    "Dialog.Close",
    "focus restoration",
    "ARIA dismiss",
    "keyboard accessibility",
    "restProps",
    "data-slot",
    "bindable ref",
    "uncontrolled mode"
  ],
  "categories": [
    "widget",
    "overlay",
    "accessibility",
    "sheet"
  ],
  "source_docs": [
    "5513573158c75ade"
  ],
  "backlinks": null,
  "word_count": 596,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet Close component renders any interactive element (typically a button) that dismisses the sheet when activated. It delegates entirely to bits-ui's `Dialog.Close` primitive — which handles the open-state mutation, ARIA attributes, and keyboard interactions — while adding only a `data-slot` identifier for Ripple's CSS targeting system.

## Why a Dedicated Close Component

A close button in a sheet panel is not just a button that sets `open = false`. It must:

1. Be keyboard-accessible (activated by Enter and Space).
2. Return focus to the element that opened the sheet after dismissal.
3. Be announced correctly by screen readers as a dismiss action.
4. Work even if the parent component doesn't explicitly manage `open` state (uncontrolled mode).

bits-ui's `Dialog.Close` handles all four requirements automatically. The Ripple wrapper exists to provide a pre-slotted, pre-named element that participates in Ripple's component API without exposing bits-ui internals to application code.

## Implementation

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";

  let { ref = $bindable(null), ...restProps }: SheetPrimitive.CloseProps = $props();
</script>

<SheetPrimitive.Close bind:ref data-slot="sheet-close" {...restProps} />
```

## Using `Dialog` as the Sheet Primitive

The import is `Dialog as SheetPrimitive`, not a Sheet-specific primitive. This reflects the architectural choice in Ripple: the Sheet UI component is built on top of bits-ui's Dialog primitive, which provides the complete modal accessibility model. Sheet adds visual styling (slide-in animations, edge positioning) but reuses Dialog's state management and ARIA wiring.

Aliasing `Dialog as SheetPrimitive` throughout the sheet sub-components makes it clear at each use site that the primitive backing this component is the Dialog, without leaking that detail to consumers of the Sheet API.

## `CloseProps` Type

`SheetPrimitive.CloseProps` includes:

- Standard HTML button attributes (type, disabled, form)
- `ref` for DOM element access
- `children` — the close button's label or icon content
- `child` — the render prop pattern for full DOM control

Because all props are forwarded via `...restProps`, application code can customize the close button's content, add ARIA labels, or pass `asChild` to render the close affordance as a non-button element (e.g., an icon-only link).

## `bind:ref` Pattern

`ref = $bindable(null)` exposes the underlying button DOM node to parents. This is used when the close button needs programmatic focus after an async operation completes, or when tests need a direct handle to the button element.

## `data-slot` Convention

`data-slot="sheet-close"` marks this element for targeting in Ripple's theming system and in test selectors. It allows CSS rules like:

```css
[data-slot='sheet-close'] { ... }
```

Without relying on fragile class names or DOM hierarchy assumptions.

## Relationship to Built-in Close Button in SheetContent

`SheetContent` includes a built-in close button (an X icon in the top-right corner). `SheetClose` is the companion component for additional close affordances — for example, a "Cancel" button in the `SheetFooter`. Both ultimately delegate to the same `Dialog.Close` primitive and trigger the same open-state change. The redundancy is intentional: users should be able to dismiss a sheet from multiple locations.

## Known Gaps

- No default children are provided. Unlike `SheetContent`'s built-in X button, this component renders nothing visible without children. Callers must provide an icon or label — an easy mistake to make.
- No disabled state management: the close button does not check whether the sheet is in a loading state where dismissal should be blocked. Application code must manage this via `disabled` in `restProps`.

## Summary

`SheetClose` is a minimal wrapper that transforms any content into a semantically correct sheet-dismiss affordance. Its value is the automatic focus restoration, keyboard support, and ARIA correctness that bits-ui's `Dialog.Close` provides out of the box.