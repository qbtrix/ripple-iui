---
{
  "title": "Sheet Portal — DOM Teleportation Wrapper",
  "summary": "SheetPortal is a thin Svelte 5 wrapper around the bits-ui Dialog.Portal primitive that teleports sheet overlay content outside the normal DOM tree. By delegating all rendering to the underlying primitive, it ensures sheet content escapes stacking contexts and z-index traps without any additional logic.",
  "concepts": [
    "sheet",
    "portal",
    "bits-ui",
    "Dialog.Portal",
    "DOM teleportation",
    "stacking context",
    "z-index",
    "overlay",
    "Svelte 5 runes",
    "restProps spread",
    "PortalProps"
  ],
  "categories": [
    "ui",
    "sheet",
    "layout",
    "overlay"
  ],
  "source_docs": [
    "9391a12d66727280"
  ],
  "backlinks": null,
  "word_count": 436,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

When a sheet (slide-in panel) is rendered inside deeply nested DOM trees, CSS stacking contexts — created by `transform`, `filter`, `will-change`, or `overflow: hidden` — can clip or obscure overlay content even when `z-index` is set very high. The portal pattern solves this by teleporting content directly to the `<body>` or another document-level mount point, placing it outside any parent stacking context entirely.

`SheetPortal` is the ripple project's standardized entry point for this behavior. Rather than implementing portal logic itself, it wraps `bits-ui`'s `Dialog.Portal`, which already handles the DOM teleportation correctly. This keeps the Sheet component family consistent with the Dialog component family at the primitive level.

## Component Design

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";

  let { ...restProps }: SheetPrimitive.PortalProps = $props();
</script>

<SheetPrimitive.Portal {...restProps} />
```

The component accepts the full `PortalProps` type from bits-ui, which allows consumers to customize the portal target via a `to` prop (defaulting to `document.body`). All props are forwarded verbatim using the spread pattern `{...restProps}`, meaning SheetPortal introduces zero behavioral differences from using `SheetPrimitive.Portal` directly.

## Why Alias Rather Than Use the Primitive Directly?

The aliasing pattern serves several important purposes:

- **Namespace consistency**: Sheet sub-components are imported from `$lib/components/ui/sheet`, not from `bits-ui`. This lets the design system control every surface that renders Sheet-related UI — if bits-ui is ever replaced or wrapped differently, only this file needs to change.
- **Type safety at the surface**: By declaring `let { ...restProps }: SheetPrimitive.PortalProps = $props()`, TypeScript enforces that only valid portal props are passed in. Consumers get correct autocompletion without importing bits-ui types directly.
- **Explicitness in JSX trees**: Using `<Sheet.Portal>` in a page component is more readable than `<SheetPrimitive.Portal>` imported from an external library.

## Data Flow

SheetPortal sits between the SheetContent and the browser DOM. The typical tree looks like:

```
<Sheet.Root>
  <Sheet.Trigger />
  <Sheet.Portal>         ← teleports everything below out of current DOM subtree
    <Sheet.Overlay />
    <Sheet.Content />
  </Sheet.Portal>
</Sheet.Root>
```

The portal renders its children at the mount point (by default `<body>`) during the bits-ui open/close lifecycle, so overlay and content elements are never subject to ancestor overflow clipping or transform-induced stacking context isolation.

## Rendering Behavior

Portal rendering is conditional — bits-ui only mounts the portal's children when the dialog/sheet is open (or during its open transition), and unmounts them on close. This means no hidden-but-present DOM nodes accumulate for every closed sheet on the page, keeping the DOM lightweight.

## Known Gaps

None. This is a complete, intentionally minimal delegation component. Future needs (e.g., a custom `to` default) would be a one-line change in the props destructuring.