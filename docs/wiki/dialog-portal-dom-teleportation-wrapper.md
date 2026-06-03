---
{
  "title": "Dialog Portal — DOM Teleportation Wrapper",
  "summary": "A one-line pass-through component that delegates to bits-ui's `DialogPrimitive.Portal`, teleporting its children out of the current DOM tree and into the document body. This prevents z-index conflicts caused by stacking contexts in ancestor elements.",
  "concepts": [
    "dialog portal",
    "DOM teleportation",
    "z-index",
    "stacking context",
    "bits-ui Portal",
    "body rendering",
    "overflow hidden escape",
    "Svelte 5 runes",
    "pass-through component"
  ],
  "categories": [
    "dialog",
    "layout",
    "ui-component"
  ],
  "source_docs": [
    "718c0b6672a2911d"
  ],
  "backlinks": null,
  "word_count": 281,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DialogPortal` exists to solve a classic CSS stacking problem: if a dialog's DOM node lives inside an ancestor with `overflow: hidden`, `transform`, or an isolated stacking context, the dialog's overlay and panel can be clipped or rendered behind other elements despite having a high `z-index`.

By teleporting the rendered output to `document.body`, the portal escapes all ancestor constraints. The dialog then stacks only against siblings of `<body>`, which is almost always a clean, unobstructed context.

## Implementation

```svelte
<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";

  let { ...restProps }: DialogPrimitive.PortalProps = $props();
</script>

<DialogPrimitive.Portal {...restProps} />
```

This is a pure pass-through — no classes, no extra props, no logic. The component's value is entirely architectural: it gives the Ripple component system a named, local `DialogPortal` export that can be swapped, wrapped, or tested in isolation without touching the bits-ui import directly.

## Why Wrap a Pass-Through?

Having a local `DialogPortal` component rather than importing `DialogPrimitive.Portal` directly provides:

1. **Consistent import surface** — consumers import from `$lib/components/ui/dialog` and never need to know about bits-ui internals.
2. **Extensibility seam** — if the portal ever needs to accept a custom `target` prop (e.g., for storybook rendering or server-side isolation), this wrapper is the single place to add it.
3. **Testability** — tests can mock `./dialog-portal.svelte` as a stub that renders children inline, removing the dependency on real DOM teleportation during unit tests.

## Props

All props are forwarded directly to `DialogPrimitive.Portal`. The `PortalProps` type from bits-ui includes a `target` prop that accepts an `HTMLElement` or CSS selector string, allowing the portal destination to be overridden when needed.

## Known Gaps

None. This component is intentionally a delegation shim.