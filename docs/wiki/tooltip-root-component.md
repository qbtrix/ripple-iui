---
{
  "title": "Tooltip Root Component",
  "summary": "The top-level orchestrator for a single tooltip instance, composing `TooltipProvider` and `bits-ui`'s `Tooltip.Root` with a bindable `open` state. Ensures every tooltip has provider context without requiring consumers to add it manually.",
  "concepts": [
    "tooltip root",
    "bindable open",
    "tooltip provider",
    "embedded provider",
    "bits-ui",
    "context provider",
    "skip delay duration",
    "programmatic control",
    "RootProps",
    "onboarding tooltip",
    "two-way binding",
    "Svelte 5 runes"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "state-management"
  ],
  "source_docs": [
    "17b017522a95133f"
  ],
  "backlinks": null,
  "word_count": 396,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Tooltip` (exported as `Root`) is the entry point for using a tooltip in ripple. It wraps both the configuration provider and the state root, so consumers can use a single `<Tooltip>` tag without thinking about the provider layer.

## Implementation

```svelte
<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  import TooltipProvider from "./tooltip-provider.svelte";
  let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps = $props();
</script>

<TooltipProvider>
  <TooltipPrimitive.Root bind:open {...restProps} />
</TooltipProvider>
```

## The Embedded Provider Pattern

Every `<Tooltip>` instance automatically wraps itself in a `<TooltipProvider>`. This is a deliberate convenience — in the vast majority of cases, each tooltip can use the default provider settings (`delayDuration = 0`). Consumers don't need to remember to add a Provider.

However, this means each tooltip has its own provider scope. If a consumer wants multiple tooltips to share a single provider (e.g., for `skipDelayDuration` behavior where moving quickly between tooltips skips the delay), they need to hoist a `<TooltipProvider>` above their tooltip group:

```svelte
<TooltipProvider delayDuration={300} skipDelayDuration={100}>
  <Tooltip.Root>...</Tooltip.Root>
  <Tooltip.Root>...</Tooltip.Root>
</TooltipProvider>
```

In this case, the embedded provider inside each `Root` would be overridden by the outer one (context is hierarchical in `bits-ui`).

## The `open` Binding

`open = $bindable(false)` exposes the tooltip's visibility state for two-way binding:

```svelte
<Tooltip bind:open={isTooltipVisible}>
```

This enables:
- **Programmatic control** — Open or close the tooltip from parent logic (e.g., open on first visit as an onboarding hint).
- **State synchronization** — Derive other UI behavior from whether a specific tooltip is open.
- **Testing** — Control tooltip state in test environments without simulating hover events.

The default of `false` means tooltips start closed, which is the expected behavior.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Bindable open/closed state |
| `...restProps` | `TooltipPrimitive.RootProps` | — | All bits-ui Root props |

## Composition with Other Components

```svelte
<Tooltip.Root>
  <Tooltip.Trigger>hover target</Tooltip.Trigger>
  <Tooltip.Content>tooltip text</Tooltip.Content>
</Tooltip.Root>
```

The Root renders no DOM element of its own — it is purely a context and state container provided by `bits-ui`.

## Known Gaps

No TODO or FIXME markers. The embedded provider means advanced provider configurations (`skipDelayDuration`, custom delay per group) require consumers to hoist their own Provider — there is no prop to configure the embedded provider from the `Root` props. This is an intentional simplification that covers the common case.