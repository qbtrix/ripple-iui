---
{
  "title": "Popover Root — State Container and Context Provider for Popovers",
  "summary": "The root component of the popover composition, wrapping bits-ui's `Popover.Root` to expose a bindable `open` state that defaults to `false`. It acts as the invisible state container and context provider that coordinates all child components — trigger, content, portal — without rendering any DOM of its own.",
  "concepts": [
    "popover root",
    "controlled component",
    "uncontrolled component",
    "bindable state",
    "Svelte context",
    "bits-ui state machine",
    "open state",
    "composition pattern",
    "context provider",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "overlay",
    "state-management"
  ],
  "source_docs": [
    "9697cf96a4ab4970"
  ],
  "backlinks": null,
  "word_count": 374,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`popover.svelte` is the orchestration root of the Ripple popover system. It renders no visible UI itself — its sole job is to initialize the bits-ui state machine, provide context to child components, and optionally expose the `open` state to parent consumers via a bindable prop.

## Why a Root Component Pattern

Popovers are composite UI patterns: a trigger activates them, content appears in a portal, and the whole interaction requires coordinated state. Rather than managing this state via props threading or stores, bits-ui uses a React Context-like mechanism (Svelte context) to share state between `Root`, `Trigger`, and `Content` without explicit wiring. The Root component sets up that context; every child reads from it.

This pattern prevents a common mistake: lifting open/close state into a parent component and manually wiring it through multiple layers of props, which creates fragile coupling and makes components hard to reuse.

## Component Structure

```svelte
<script lang="ts">
  import { Popover as PopoverPrimitive } from "bits-ui";

  let { open = $bindable(false), ...restProps }: PopoverPrimitive.RootProps = $props();
</script>

<PopoverPrimitive.Root bind:open {...restProps} />
```

## Props

- **`open`** (`boolean`, bindable, default `false`): The open/close state of the popover. Making it bindable with `$bindable(false)` means:
  - If the parent doesn't bind it, the popover manages its own state internally (uncontrolled mode).
  - If the parent binds it (e.g., `bind:open={myVar}`), the parent gains full programmatic control — it can open, close, or observe the popover state (controlled mode).
- **`...restProps`**: All `PopoverPrimitive.RootProps` — includes `onOpenChange`, `modal`, and other behavioral settings.

## Controlled vs Uncontrolled Mode

The `$bindable(false)` default enables both usage patterns from a single component:

```svelte
<!-- Uncontrolled: manages its own open state -->
<Popover.Root>
  <Popover.Trigger>Open</Popover.Trigger>
  <Popover.Content>Content</Popover.Content>
</Popover.Root>

<!-- Controlled: parent drives open state -->
<Popover.Root bind:open={isOpen}>
  ...
</Popover.Root>
```

The controlled pattern is essential for generative UI scenarios where the AI runtime (Ripple) needs to open or close popovers programmatically in response to data changes.

## Data Flow

```
Popover.Root (context provider)
  ├── Popover.Trigger (reads context, toggles open)
  ├── Popover.Portal (reads context, activates on open)
  │   └── Popover.Content (reads context, renders when open)
  │       ├── Popover.Title
  │       └── Popover.Description
  └── ...
```

## Known Gaps

No known gaps. The default value of `false` is appropriate and the component is correctly typed.