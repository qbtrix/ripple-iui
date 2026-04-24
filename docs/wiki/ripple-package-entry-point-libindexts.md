---
{
  "title": "Ripple Package Entry Point — lib/index.ts",
  "summary": "The top-level `lib/index.ts` is the public API surface of the Ripple package. It re-exports the main `Ripple` Svelte component, the full core engine (StateManager, EventDispatcher, expression resolver, normalizer), widget registry utilities, Zod-backed schemas, the `reorderable` action, and all public TypeScript types.",
  "concepts": [
    "package entry point",
    "barrel file",
    "Ripple component",
    "StateManager",
    "EventDispatcher",
    "WidgetRegistry",
    "schema exports",
    "OnEventCallback",
    "RippleEvent",
    "reorderable",
    "public API"
  ],
  "categories": [
    "module-system",
    "public-api",
    "core"
  ],
  "source_docs": [
    "edcd6e9b96478809"
  ],
  "backlinks": null,
  "word_count": 442,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/index.ts` is the single entry point that tools like bundlers, IDEs, and consumers target when they import from the `ripple` package (or its local path alias). It acts as a stable public contract — internal file moves and refactors do not break consumers as long as this barrel remains consistent.

## Exported Groups

### Main Component

```typescript
export { default as Ripple } from './Ripple.svelte';
```

The root `Ripple` Svelte component is the primary consumer-facing export. It accepts a `spec` prop and renders the full widget tree.

### Core Engine

```typescript
export { StateManager, createStateManager } from './core/state-manager.svelte.js';
export {
  EventDispatcher, createEventDispatcher,
  FlowAbortError, MAX_FLOW_DEPTH,
  CONFIRM_STATE_KEY, FLOW_ERROR_STATE_KEY,
  type PendingConfirm
} from './core/event-dispatcher.js';
export { WidgetRegistry, createWidgetRegistry, type WidgetMethod } from './core/widget-registry.js';
export {
  evaluateExpression, resolveString, resolveObject,
  resolveValue, evaluateCondition, hasExpressions,
  type ResolverContext
} from './core/expression-resolver.js';
export { normalizeSpec } from './core/normalizer.js';
```

Note that `FlowAbortError`, `MAX_FLOW_DEPTH`, `CONFIRM_STATE_KEY`, and `FLOW_ERROR_STATE_KEY` are explicitly listed here (not re-exported via `export *`). This makes them part of the stable public API — consumers building custom host integrations can import and use these constants to handle flow errors or implement their own confirm dialogs.

### Widget Registry (Component Registration)

```typescript
export {
  getWidget, registerWidget, unregisterWidget,
  hasWidget, getWidgetTypes, resetRegistry
} from './widgets/index.js';
```

This is the **component type registry** (different from `WidgetRegistry` above). It maps widget type strings like `'button'`, `'chart'`, `'table'` to their Svelte component implementations. Consumers can call `registerWidget` to add custom widget types.

### Schema

```typescript
export { UISpec, UINode, DataFetcher, ThemeOverrides, parseUISpec, safeParseUISpec } from './schema/ui-spec.js';
export { UniversalSpec, IntentType, LifecycleType, parseUniversalSpec, safeParseUniversalSpec } from './schema/universal-spec.js';
export { EventHandler, EventAction, EventHandlerOrArray } from './schema/event-handler.js';
export { WidgetType, WIDGET_CATEGORIES } from './schema/widget-types.js';
```

Zod-powered schemas are exported for consumers that want to validate specs at application boundaries. The `parse*` variants throw on invalid input; `safeParse*` return `{ success, data, error }`.

### Actions

```typescript
export { reorderable, type ReorderableOptions } from './actions/reorderable.js';
```

`reorderable` is a Svelte action (used with `use:reorderable`) that adds drag-to-reorder behavior to container elements.

### Types

```typescript
export type { RippleEvent, RippleEventResult } from './types.js';
export type { OnEventCallback } from './core/event-dispatcher.js';
```

`RippleEvent` is the discriminated union of all events that flow through the `OnEventCallback`. `RippleEventResult` is the structured response shape for `api` actions. Both are type-only exports — they carry no runtime cost.

## Known Gaps

- The `intent/` subsystem (`ChainExecutor`, `DashboardManager`, `DashboardRenderer`) is **not** exported from this top-level barrel. Consumers of those classes must import from `ripple/intent` or the specific file path directly.
- `resolveObject` is exported from the expression resolver but is not listed in the `lib/core/index.ts` barrel — it is only accessible via this top-level export.
