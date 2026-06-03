---
{
  "title": "Separator Component — Accessible Horizontal and Vertical Divider",
  "summary": "A styled wrapper around bits-ui's `Separator.Root` that renders a 1px divider line in either horizontal or vertical orientation. It applies design-token colors and includes a deliberate deviation from the upstream shadcn/ui pattern to fix a self-stretch layout bug.",
  "concepts": [
    "separator",
    "horizontal divider",
    "vertical divider",
    "data-orientation",
    "self-stretch bug fix",
    "h-full",
    "bg-border token",
    "shrink-0",
    "data-slot override",
    "SeparatorPrimitive.Root"
  ],
  "categories": [
    "layout",
    "widget",
    "accessibility",
    "design-tokens"
  ],
  "source_docs": [
    "2210243552c9339f"
  ],
  "backlinks": null,
  "word_count": 667,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Separator component renders a thin dividing line between sections of content. It is used directly in page layouts and is also consumed by `SelectSeparator` for option group dividers. The implementation wraps bits-ui's `SeparatorPrimitive.Root` with Ripple-specific token-based styling and an important vertical-layout fix.

## Implementation

```svelte
<script lang="ts">
  import { Separator as SeparatorPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    "data-slot": dataSlot = "separator",
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  data-slot={dataSlot}
  class={cn(
    "bg-border shrink-0",
    "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
    "data-[orientation=vertical]:w-px",
    "data-[orientation=vertical]:h-full",
    className
  )}
  {...restProps}
/>
```

## Orientation Handling via `data-[orientation]`

bits-ui sets `data-orientation="horizontal"` or `data-orientation="vertical"` on the rendered element based on the `orientation` prop. Ripple maps each orientation to appropriate dimension classes:

| Orientation | Width | Height |
|---|---|---|
| Horizontal | `w-full` (100% of container) | `h-px` (1px) |
| Vertical | `w-px` (1px) | `h-full` (100% of container) |

This approach keeps all layout logic in CSS — no JavaScript conditional class application needed.

## The `self-stretch` Deviation — A Documented Bug Fix

The comment in the source is significant:

```
// this is different in shadcn/ui but self-stretch breaks things for us
"data-[orientation=vertical]:h-full",
```

The upstream shadcn/ui Separator uses `self-stretch` for vertical separators. `self-stretch` is a flexbox/grid alignment value that makes the element stretch to fill its cross-axis within the parent flex container. In theory this is elegant — the separator automatically fills available vertical space without knowing the container height.

In practice, `self-stretch` breaks when the separator is used in a non-flex or non-grid container, or when the flex container has a `height: auto` parent. The element has no reference height to stretch to and collapses to 0px height — invisible.

Ripple replaces `self-stretch` with `h-full`, which is a more predictable value: the separator takes the full height of its closest positioned ancestor. This works correctly in both flex and non-flex contexts, at the cost of requiring the parent to have a defined height for the separator to reach.

## `data-slot` as a Configurable Prop

Unlike most Ripple components where `data-slot` is hardcoded, Separator accepts it as an overridable prop with a default of `"separator"`:

```typescript
"data-slot": dataSlot = "separator"
```

This allows `SelectSeparator` to override the slot name to `"select-separator"` when embedding this component, enabling CSS rules to distinguish a standalone separator from one inside a select listbox. The pattern is clean — one component, multiple named contexts.

## `shrink-0`

The `shrink-0` class prevents the separator from compressing in a flex container when siblings are competing for space. Without it, a horizontal separator in a column flex layout could shrink to 0px height when the container is space-constrained. Since a 1px separator is already at minimum useful size, any shrinking would make it disappear.

## `bg-border` Design Token

`bg-border` uses the `border` CSS custom property defined in Ripple's design token system. This token resolves to the correct color in both light and dark mode without any additional `dark:` modifier needed on the separator itself. The token is defined at the `:root` level and reacts to `[data-theme]` or `prefers-color-scheme` automatically.

## Bindable Ref

`ref = $bindable(null)` exposes the underlying DOM element to parents. This enables measurement (e.g., checking the separator's rendered height in integration tests) or imperative visibility changes without querying the DOM.

## Known Gaps

- The `h-full` fix for vertical separators requires the parent element to have an explicit or inherited height. If the parent is `height: auto`, the separator will still collapse. The comment documents the trade-off but no automatic fallback exists.
- No `decorative` prop is surfaced directly — it must be passed via `restProps`. For ARIA correctness, non-decorative separators (those that represent genuine content boundaries) should have `decorative={false}` to enable the `role="separator"` attribute.

## Summary

Separator is a small but carefully considered component. Its deliberate deviation from upstream shadcn/ui (`h-full` vs `self-stretch`) prevents a real layout failure. The configurable `data-slot` prop enables reuse across multiple semantic contexts, and the `bg-border` token ensures automatic dark mode compatibility.