---
{
  "title": "Popover Close — Dismiss Button Wired to Popover State",
  "summary": "A minimal wrapper around bits-ui's `PopoverPrimitive.Close` that renders a button capable of dismissing the parent popover. Exposes a bindable `ref` and forwards all props, with no custom logic beyond the data-slot marker.",
  "concepts": [
    "popover close",
    "dismiss button",
    "bits-ui context",
    "stateless dismiss",
    "PopoverPrimitive.Close",
    "data-slot",
    "bindable ref",
    "Svelte 5 runes",
    "context-based state"
  ],
  "categories": [
    "popover",
    "interaction",
    "ui-component"
  ],
  "source_docs": [
    "bec13457158cb16b"
  ],
  "backlinks": null,
  "word_count": 279,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`PopoverClose` renders an element that, when activated, closes the ancestor `Popover.Root`. Unlike a plain button with a click handler that sets `open = false`, `PopoverClose` works through bits-ui context — it connects to the popover's internal state without requiring the caller to hold a reference to the open state.

This is essential for use cases where the popover content is rendered by a component that does not own the open state. For example, a reusable `NotificationCard` component rendered inside a popover can include a dismiss button without receiving `open` as a prop.

## Implementation

```svelte
<script lang="ts">
  import { Popover as PopoverPrimitive } from "bits-ui";

  let { ref = $bindable(null), ...restProps }: PopoverPrimitive.CloseProps = $props();
</script>

<PopoverPrimitive.Close bind:ref data-slot="popover-close" {...restProps} />
```

The component renders a `<button>` by default (delegated to the bits-ui primitive). All event handling and state mutation is delegated to bits-ui via context — there is no click handler in this component.

## Rendering Custom Close Elements

`PopoverClose` accepts `children` via `restProps`, so custom close content is possible:

```svelte
<PopoverClose>
  <Icon name="x" /> Dismiss
</PopoverClose>
```

For more complex scenarios where you need to thread the close button's props into a styled component (like the dialog footer does), the bits-ui `child` snippet pattern can be used directly on the primitive.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | bindable | Exposes the underlying button DOM node |
| `...restProps` | `PopoverPrimitive.CloseProps` | Forwarded to bits-ui |

## Known Gaps

None. Compared to `DialogFooter`'s `showCloseButton` pattern, this component takes the opposite approach — it is always a close button, not an optional one. The two patterns serve different composition needs.