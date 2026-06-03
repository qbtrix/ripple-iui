---
{
  "title": "Tooltip Component Public API Index",
  "summary": "The barrel file for the Tooltip component family, re-exporting five sub-components — Root, Trigger, Content, Provider, and Portal — under both short and verbose names. Forms the single import surface for all tooltip functionality.",
  "concepts": [
    "tooltip",
    "barrel file",
    "portal",
    "provider",
    "trigger",
    "content",
    "dual naming",
    "overflow hidden",
    "delay duration",
    "named exports",
    "namespace import",
    "bits-ui",
    "tooltip group"
  ],
  "categories": [
    "tooltip",
    "overlay",
    "accessibility"
  ],
  "source_docs": [
    "509107c659c77010"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This `index.ts` is the public entry point for ripple's Tooltip component system. It is more complex than most component barrels because the tooltip has five distinct parts, each with a separate responsibility.

## Exported Components

```typescript
import Root from "./tooltip.svelte";
import Trigger from "./tooltip-trigger.svelte";
import Content from "./tooltip-content.svelte";
import Provider from "./tooltip-provider.svelte";
import Portal from "./tooltip-portal.svelte";
```

| Short name | Verbose name | Role |
|------------|--------------|------|
| `Root` | `Tooltip` | Wraps Provider + bits-ui Root; controls open state |
| `Trigger` | `TooltipTrigger` | The element that shows the tooltip on hover/focus |
| `Content` | `TooltipContent` | The tooltip bubble with arrow, animation, and portal |
| `Provider` | `TooltipProvider` | Shared delay and behavior config for tooltip groups |
| `Portal` | `TooltipPortal` | Renders content outside the DOM subtree via portal |

## Why Five Components

Tooltips appear simple but have multiple distinct responsibilities that benefit from separation:

1. **Root** — Owns the `open` state and wires it to the trigger/content relationship.
2. **Trigger** — Needs to be a focusable element (or wrap one) so keyboard users can activate the tooltip. Separating it allows the consumer to wrap any element without constraints.
3. **Content** — Manages positioning, animation, and the arrow indicator. Separating it allows multiple tooltips to share a single Provider configuration.
4. **Provider** — Sets `delayDuration` for an entire section of UI. Without a shared Provider, every `Root` would need its own delay configuration.
5. **Portal** — Solves the `overflow: hidden` problem. If tooltip content is rendered inside its trigger's DOM parent, a clipping ancestor will hide it. The portal renders the bubble at the document body level, escaping all clipping contexts.

## Dual Naming Strategy

As with all ripple component barrels, each export has both a structural name (`Root`, `Content`, etc.) for namespace imports and a semantic name (`Tooltip`, `TooltipContent`, etc.) for named imports. This supports both usage patterns:

```svelte
<!-- Namespace style -->
import * as Tooltip from "$lib/components/ui/tooltip";
<Tooltip.Root><Tooltip.Trigger>...</Tooltip.Trigger><Tooltip.Content>Hint</Tooltip.Content></Tooltip.Root>

<!-- Named style -->
import { Tooltip, TooltipTrigger, TooltipContent } from "$lib/components/ui/tooltip";
```

## Known Gaps

No TODO or FIXME markers. The `Portal` component is exported but consumers who use `Root` will not need it directly — `Content` already wraps `Portal` internally. The export is provided for advanced use cases where consumers want to control portal placement explicitly.