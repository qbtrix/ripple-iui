---
{
  "title": "Tooltip Provider Component",
  "summary": "A shared configuration provider for tooltip groups, setting `delayDuration` to zero by default to deliver immediate tooltip responses. Wraps `bits-ui`'s Tooltip.Provider to override the library's built-in delay.",
  "concepts": [
    "tooltip provider",
    "delayDuration",
    "hover delay",
    "bits-ui",
    "shared configuration",
    "context provider",
    "Svelte context",
    "ProviderProps",
    "skip delay",
    "tooltip group",
    "immediate tooltip"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "state-management"
  ],
  "source_docs": [
    "3599daffb73460dc"
  ],
  "backlinks": null,
  "word_count": 350,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TooltipProvider` establishes shared configuration for all tooltips nested within it. Its primary role is to control the hover delay before tooltips appear — a behavior that significantly affects perceived responsiveness.

## Implementation

```svelte
<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  let { delayDuration = 0, ...restProps }: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {...restProps} />
```

## The `delayDuration = 0` Default

The most significant design decision in this component is the default of `0` for `delayDuration`. `bits-ui` and the underlying Radix primitives default to a delay of ~700ms before showing tooltips — a conservative value intended to prevent tooltips from flashing during accidental cursor passes.

Ripple overrides this to `0`, meaning tooltips appear immediately on hover. This is appropriate for **application UIs** where users are actively looking for information about UI elements, as opposed to reading contexts where instant tooltips would be intrusive. In ripple's context as a generative UI runtime, fast feedback is preferred.

Consumers who want the standard delay can pass `delayDuration={700}` explicitly, or a different value to tune the behavior.

## Shared Configuration Scope

The Provider works via Svelte context — `bits-ui`'s `Tabs.Provider` sets a context value that all `Tooltip.Root` descendants read. This means wrapping a section of UI in a single `TooltipProvider` applies the delay configuration to every tooltip in that subtree without touching individual `Tooltip.Root` instances.

This is why `Tooltip.svelte` (the `Root` wrapper) embeds a `TooltipProvider` by default — it ensures every tooltip has a provider without requiring consumers to add one manually. Advanced consumers who want a single shared provider for an entire page can hoist it above their layout.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delayDuration` | `number` | `0` | Milliseconds before tooltip shows on hover |
| `...restProps` | `TooltipPrimitive.ProviderProps` | — | All other bits-ui Provider props |

## Known Gaps

No TODO or FIXME markers. `bits-ui`'s `ProviderProps` may include other shared configuration options (like `skipDelayDuration` for when users move between tooltips quickly) — these pass through via `restProps` but are not documented with explicit defaults here.