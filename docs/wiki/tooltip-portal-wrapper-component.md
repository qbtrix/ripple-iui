---
{
  "title": "Tooltip Portal Wrapper Component",
  "summary": "A minimal pass-through wrapper around `bits-ui`'s `Tooltip.Portal`, enabling tooltip content to be rendered outside its DOM ancestor tree. Prevents clipping by `overflow: hidden` ancestors.",
  "concepts": [
    "portal",
    "tooltip portal",
    "bits-ui",
    "overflow hidden",
    "z-index",
    "stacking context",
    "DOM escape",
    "PortalProps",
    "document.body",
    "pass-through wrapper",
    "clipping",
    "Svelte 5 runes"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "layout"
  ],
  "source_docs": [
    "d38e62fa30732ba5"
  ],
  "backlinks": null,
  "word_count": 317,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TooltipPortal` is a thin delegation component with a single job: render its children outside the normal DOM subtree. It exists as a separate named component (rather than being inlined into `TooltipContent`) so that it can be:

1. Exported independently from the barrel for advanced use cases.
2. Configured via `portalProps` in `TooltipContent` without prop drilling through multiple layers.
3. Swapped or mocked in tests independently of the content component.

## Implementation

```svelte
<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  let { ...restProps }: TooltipPrimitive.PortalProps = $props();
</script>

<TooltipPrimitive.Portal {...restProps} />
```

All props are passed through to `bits-ui`'s `Portal`. The `PortalProps` type from `bits-ui` typically includes a `to` prop that specifies the portal target element (defaulting to `document.body`).

## Why Portals Are Necessary

Tooltip bubbles must appear above all other content. The CSS stacking context model means that a high `z-index` alone is not sufficient — if the tooltip's DOM ancestor has `overflow: hidden`, `transform`, or `filter`, the tooltip will be clipped or affected by that context regardless of `z-index`. Rendering via a portal at `document.body` level places the tooltip outside all such clipping and stacking contexts.

Without this component, a tooltip inside a modal, a card with `overflow: hidden`, or a transformed container would be partially or fully hidden. The portal is the defensive solution that guarantees visibility.

## Separation from Content

`TooltipContent` always wraps in `TooltipPortal`. The portal is not optional from the consumer's perspective when using `TooltipContent`. However, having a separate `Portal` component in the barrel allows power users to compose tooltips manually:

```svelte
<Tooltip.Root>
  <Tooltip.Trigger>hover me</Tooltip.Trigger>
  <Tooltip.Portal to="#custom-layer">
    <bits-ui Tooltip.Content>Custom portal target</bits-ui Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
```

## Known Gaps

No TODO or FIXME markers. Because the component is a pure pass-through, any `bits-ui` API changes to `PortalProps` are automatically handled without changes to this file. The component has no default `to` target — `bits-ui` handles the default (`document.body`).