---
{
  "title": "Core Module Barrel — lib/core/index.ts",
  "summary": "The `lib/core/index.ts` barrel re-exports all public symbols from Ripple's four core subsystems: StateManager, EventDispatcher, expression resolver utilities, and the spec normalizer. It provides a single stable import path for the core engine without exposing internal module structure.",
  "concepts": [
    "barrel file",
    "re-export",
    "module boundary",
    "StateManager",
    "EventDispatcher",
    "expression-resolver",
    "normalizeSpec",
    "import path",
    "core engine"
  ],
  "categories": [
    "core",
    "module-system"
  ],
  "source_docs": [
    "7675569955c53ade"
  ],
  "backlinks": null,
  "word_count": 492,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/core/index.ts` is a pure re-export barrel file. It does not define any symbols of its own — its entire purpose is to aggregate the public API of Ripple's core engine layer into a single, stable import path for downstream consumers.

## What It Exports

```typescript
export { StateManager, createStateManager } from './state-manager.svelte.js';
export { EventDispatcher, createEventDispatcher, type OnEventCallback } from './event-dispatcher.js';
export * from './expression-resolver.js';
export { normalizeSpec } from './normalizer.js';
```

The four source modules it re-exports correspond to distinct subsystem responsibilities:

| Module | Exports | Role |
|---|---|---|
| `state-manager.svelte.ts` | `StateManager`, `createStateManager` | Reactive widget state via Svelte 5 `$state` |
| `event-dispatcher.ts` | `EventDispatcher`, `createEventDispatcher`, `OnEventCallback` | Action execution and flow orchestration |
| `expression-resolver.ts` | All exported symbols (`export *`) | Template binding and condition evaluation |
| `normalizer.ts` | `normalizeSpec` | Input normalization before rendering |

## Why a Barrel?

Without this barrel, consumers of Ripple's core would need to import from individual `.svelte.js` or `.js` paths with implementation-specific extensions:

```typescript
// Without barrel (fragile — exposes internal paths)
import { StateManager } from 'ripple/core/state-manager.svelte.js';
import { EventDispatcher } from 'ripple/core/event-dispatcher.js';
```

The barrel collapses this to a single stable entry:

```typescript
// With barrel (stable public contract)
import { StateManager, EventDispatcher, normalizeSpec } from 'ripple/core';
```

This matters especially for the `.svelte.js` suffix — the Svelte compiler emits `.svelte.js` output files for `.svelte.ts` sources, and that suffix would otherwise be visible in consumer import statements. The barrel absorbs that detail and exposes a clean path.

## expression-resolver Uses export *

All symbols from `expression-resolver.ts` are re-exported with `export *` rather than a named list. This is intentional: the resolver exports many utility functions (`hasExpressions`, `isSingleExpression`, `evaluateExpression`, `resolveString`, `resolveObject`, `resolveValue`, `evaluateCondition`) plus the `ResolverContext` interface. Enumerating them would add maintenance overhead every time a new resolver utility is added — `export *` handles additions automatically.

## What This Barrel Does Not Export

Notably absent from this barrel:

- `WidgetRegistry` — exported directly from `lib/index.ts` (the top-level package barrel), bypassing the `lib/core` aggregation point
- `FlowAbortError`, `MAX_FLOW_DEPTH`, `CONFIRM_STATE_KEY`, `FLOW_ERROR_STATE_KEY`, `PendingConfirm` — these are exported individually from `lib/index.ts` for the top-level public API but are not surfaced here

This means `lib/core/index.ts` is not a complete mirror of everything in the `core/` directory — it exports only what renderer and component code typically needs, while the top-level barrel adds the symbols that host integrators need.

## Import Hierarchy

```
lib/index.ts (top-level public API)
  └── lib/core/index.ts (core engine layer)
       ├── state-manager.svelte.js
       ├── event-dispatcher.js
       ├── expression-resolver.js
       └── normalizer.js
```

Components inside `lib/` that need core engine access import from `./core/index.js` (relative). External consumers of the npm package import from the top-level entry. Neither group needs to know about the individual module file paths.

## Known Gaps

The `WidgetRegistry` class lives in `lib/core/widget-registry.ts` but is not re-exported by this barrel. A developer browsing `lib/core/index.ts` looking for the full core API surface would miss it entirely, creating a discoverability gap.
