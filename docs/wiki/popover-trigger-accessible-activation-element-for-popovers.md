---
{
  "title": "Popover Trigger — Accessible Activation Element for Popovers",
  "summary": "Wraps the bits-ui `Popover.Trigger` primitive to give it a `data-slot` identifier and class-merge support, while binding the DOM reference back to the caller. It is the interactive element users click or activate to open a popover, with all accessibility behavior — ARIA attributes, keyboard handling, focus management — delegated to the headless primitive.",
  "concepts": [
    "popover trigger",
    "bits-ui",
    "asChild pattern",
    "ARIA expanded",
    "keyboard activation",
    "cn utility",
    "bindable ref",
    "data-slot",
    "focus management",
    "headless component"
  ],
  "categories": [
    "widget",
    "overlay",
    "interaction"
  ],
  "source_docs": [
    "6b8f6549c81f9e3e"
  ],
  "backlinks": null,
  "word_count": 412,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`popover-trigger.svelte` is the interactive activation point for a popover. When a user clicks, taps, or keyboard-activates this element, the parent `Popover.Root` transitions to the open state, causing the associated `PopoverContent` to appear. All state management, ARIA attribute toggling, and keyboard handling (`Enter`, `Space`) are handled by the `bits-ui` primitive — this wrapper only adds Ripple-specific styling hooks.

## Why a Wrapper Instead of Using the Primitive Directly

The wrapper serves two purposes. First, it injects `data-slot="popover-trigger"` so that Ripple's CSS and test infrastructure can target triggers by role without structural coupling. Second, it routes the `class` prop through `cn("", className)` — an empty base string plus the consumer override — so the trigger is unstyled by default but participates in the same class-merge pattern used across all Ripple components. This means any trigger element in the system behaves predictably when class props are passed.

## Component Structure

```svelte
<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Popover as PopoverPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: PopoverPrimitive.TriggerProps = $props();
</script>

<PopoverPrimitive.Trigger
  bind:ref
  data-slot="popover-trigger"
  class={cn("", className)}
  {...restProps}
/>
```

## Props

- **`ref`** (`HTMLElement | null`, bindable): The underlying trigger DOM element. Useful for positioning logic, focus management, or analytics instrumentation that needs to measure or observe the trigger.
- **`class`** (`string`, optional): Applied via `cn` over an empty base. The trigger ships with zero default styles intentionally — it adapts to whatever element wraps it (button, icon, text).
- **`...restProps`**: Full `TriggerProps` spread — includes `disabled`, `asChild`, and any HTML button attributes.

## The `asChild` Pattern

One key inherited prop is `asChild`. When `true`, the bits-ui primitive merges its behavior onto the child element rather than rendering its own button. This allows wrapping custom interactive elements — icon buttons, avatar chips, custom menu items — without nesting a `<button>` inside another interactive element, which would violate HTML semantics and confuse screen readers.

## ARIA and Keyboard Behavior

The primitive automatically manages:
- `aria-expanded` — reflects popover open/closed state
- `aria-haspopup="dialog"` — signals to assistive tech that activation opens a dialog-like overlay
- `Enter` / `Space` keyboard activation
- Focus return to the trigger when the popover closes

## Data Flow

The trigger communicates with `Popover.Root` through a shared context provided by bits-ui. There are no explicit event bindings in this component — state flows through context, not prop drilling.

## Known Gaps

No known gaps. The component correctly passes all props and bindings.