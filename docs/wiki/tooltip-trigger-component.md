---
{
  "title": "Tooltip Trigger Component",
  "summary": "A minimal wrapper around `bits-ui`'s `Tooltip.Trigger`, adding a `data-slot` identifier and exposing a bindable `ref`. Acts as the hover/focus target that activates the tooltip.",
  "concepts": [
    "tooltip trigger",
    "aria-describedby",
    "hover detection",
    "focus management",
    "bits-ui",
    "data-slot",
    "bindable ref",
    "TriggerProps",
    "keyboard accessibility",
    "Escape key",
    "touch support",
    "Svelte 5 runes"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "accessibility"
  ],
  "source_docs": [
    "743356585beeefc6"
  ],
  "backlinks": null,
  "word_count": 381,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TooltipTrigger` is the element that users interact with to reveal a tooltip. It is intentionally minimal — nearly all behavior (hover detection, focus management, ARIA wiring) is handled by `bits-ui`'s primitive. Ripple adds only the `data-slot` marker and a bindable `ref`.

## Implementation

```svelte
<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  let { ref = $bindable(null), ...restProps }: TooltipPrimitive.TriggerProps = $props();
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {...restProps} />
```

## Why So Simple

The tooltip trigger's complexity lives in `bits-ui`. The primitive handles:

- **`aria-describedby`** — Associates the trigger with the tooltip content element so screen readers announce the tooltip text when the trigger receives focus.
- **Hover and focus listeners** — Opens the tooltip on `mouseenter`/`focus`, closes on `mouseleave`/`blur`.
- **Escape key handling** — Closes the tooltip when the user presses Escape.
- **Touch support** — Opens the tooltip on tap with appropriate delay on touch devices.

Ripple does not need to reimplement any of this. The wrapper exists primarily to attach `data-slot="tooltip-trigger"` for CSS targeting, and to expose `ref` in the Svelte 5 `$bindable` pattern.

## The `data-slot` Attribute

`data-slot="tooltip-trigger"` allows parent components or global CSS to target the trigger element without relying on class names. For example, a form field component might style its label differently when it contains a tooltip trigger.

## Bindable `ref`

The `ref = $bindable(null)` gives parent components access to the trigger's DOM node. Common use cases include:
- Programmatically opening/closing the tooltip by focusing the trigger.
- Measuring the trigger's dimensions to implement custom positioning.
- Integrating with third-party drag-and-drop or selection libraries that need DOM references.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable DOM reference |
| `...restProps` | `TooltipPrimitive.TriggerProps` | — | All bits-ui Trigger props |

## Usage Pattern

```svelte
<Tooltip.Root>
  <Tooltip.Trigger>
    <Button variant="ghost" size="icon"><InfoIcon /></Button>
  </Tooltip.Trigger>
  <Tooltip.Content>This button opens the settings panel</Tooltip.Content>
</Tooltip.Root>
```

The trigger wraps any interactive element. `bits-ui` attaches its event listeners to whatever element the trigger renders as.

## Known Gaps

No TODO or FIXME markers. The trigger does not apply any default styling — no cursor change, no visual affordance that a tooltip is available. Consumers must ensure the wrapped element provides sufficient hover/focus signaling.