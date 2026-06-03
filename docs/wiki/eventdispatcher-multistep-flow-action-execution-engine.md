---
{
  "title": "EventDispatcher — Multistep Flow Action Execution Engine",
  "summary": "The EventDispatcher is Ripple's core runtime for executing declarative event handlers against a StateManager. It supports 12 action types including composite multi-step flows, async API chaining, conditional branching, user confirmation dialogs, validation guards, and direct widget method invocation.",
  "concepts": [
    "EventDispatcher",
    "FlowAbortError",
    "OnEventCallback",
    "RippleEventResult",
    "MAX_FLOW_DEPTH",
    "CONFIRM_STATE_KEY",
    "FLOW_ERROR_STATE_KEY",
    "flow actions",
    "api chaining",
    "confirm suspension",
    "freshContext",
    "WidgetRegistry",
    "StateManager",
    "expression resolution"
  ],
  "categories": [
    "core",
    "event-system",
    "flow-actions",
    "state-management"
  ],
  "source_docs": [
    "7d873fc82bf112ca"
  ],
  "backlinks": null,
  "word_count": 702,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`EventDispatcher` is the execution engine that turns Ripple's declarative `EventHandler` specs into runtime behavior. Every widget interaction — a button click, a form submit, a list selection — passes through this class. It bridges the JSON spec layer and the host application by emitting `RippleEvent` objects via the `OnEventCallback` for externally-handled actions, while handling state mutations, flow control, and widget method calls internally.

## Constants

```typescript
export const MAX_FLOW_DEPTH = 8;        // Guards against runaway nested flows
export const CONFIRM_STATE_KEY = '_ripple_confirm';  // Dialog state key
export const FLOW_ERROR_STATE_KEY = '_flow_error';    // Last error context
```

`MAX_FLOW_DEPTH` exists because spec authors (often AI-generated) can accidentally create deeply recursive flow structures. Without this guard, an unbounded recursion could exhaust the call stack silently.

## FlowAbortError

```typescript
export class FlowAbortError extends Error {
  constructor(public reason: string, public context: Record<string, unknown> = {}) { ... }
}
```

This is a **control-flow signal**, not a bug. When a `validate` step fails, it throws `FlowAbortError` rather than returning a boolean. This allows the abort to propagate through nested `runHandlers` calls and be caught by either the enclosing `flow`'s `on_error` handler or the top-level `dispatch` method (which swallows it silently). Any other error type is a real bug and is re-thrown.

## OnEventCallback and Legacy Compatibility

```typescript
export type OnEventCallback = (event: RippleEvent) => void | Promise<RippleEventResult | void>;
```

The callback accepts both the old void return (legacy hosts) and the new `RippleEventResult` shape `{ ok: boolean, data?, error? }`. Legacy hosts returning `void` are treated as silent success: `on_success` chains still run, but no `response_key` is populated. This allows incremental migration of host implementations.

## Action Dispatch

The `dispatch` method is the public entry point. It accepts a single handler or an array, normalizes to an array, and iterates sequentially via `runHandlers`. A switch statement in `dispatchSingle` dispatches to the appropriate handler:

| Action | Handler | Notes |
|---|---|---|
| `set` | `handleSet` | Resolves string expressions before writing |
| `open` | `handleOpen` | Shorthand: sets target to `true` |
| `navigate`, `toast`, `emit`, `pin`, `unpin` | `emitExternal` | Passed to host via `onEvent` |
| `api` | `handleApi` | Async; returns `RippleEventResult` |
| `flow` | `handleFlow` | Sequential steps with depth tracking |
| `branch` | `handleBranch` | Evaluates condition; runs `then` or `else` |
| `confirm` | `handleConfirm` | Suspends via Promise until user responds |
| `validate` | `handleValidate` | Throws `FlowAbortError` on failure |
| `delay` | inline | `await sleep(handler.ms)` |
| `invoke` | `handleInvoke` | Calls registered widget method |
| unknown | warn | TypeScript exhaustiveness check at runtime |

## API Async Chaining

`handleApi` is the most complex action. It emits an `api` event, awaits the result, then branches into `on_success` or `on_error` continuations:

```typescript
const raw = maybe && typeof (maybe as Promise<unknown>).then === 'function'
  ? await (maybe as Promise<RippleEventResult | void>)
  : (maybe as RippleEventResult | void);
```

The duck-type check (`typeof .then === 'function'`) avoids requiring the host to explicitly wrap non-async returns, maintaining compatibility with both sync and async host implementations.

## Confirm Suspension

`handleConfirm` uses a Map-based registry to suspend execution until a dialog is resolved:

```typescript
const decision = await new Promise<'confirm' | 'cancel'>((resolve) => {
  this.confirmRegistry.set(pendingId, resolve);
  this.stateManager.set(CONFIRM_STATE_KEY, pending);
});
```

The ConfirmDialog widget calls `dispatcher.resolveConfirm(pendingId, 'confirm')` when the user clicks. The `finally` block always clears `CONFIRM_STATE_KEY` — even if the `on_confirm` handler throws — preventing the dialog from remaining mounted with a stale pending state.

## freshContext Pattern

After every state-mutating step, continuations receive a `freshContext()` snapshot:

```typescript
private freshContext(context: ResolverContext): ResolverContext {
  return { ...context, state: this.stateManager.state };
}
```

Without this, a flow step that sets `state.count = 5` followed by a step that reads `{state.count}` would see the pre-mutation value because the original `context` object was captured by reference at the start of the flow.

## Known Gaps

- The `invoke` action warns and continues when a target is unregistered. There is no mechanism to optionally make an `invoke` failure abort the flow.
- The `uuid()` function falls back to a timestamp-plus-random suffix in environments without `crypto.randomUUID` — this suffix has limited entropy and could theoretically collide under high-frequency confirm dialogs.
