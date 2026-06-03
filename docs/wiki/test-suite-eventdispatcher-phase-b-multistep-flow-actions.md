---
{
  "title": "Test Suite: EventDispatcher — Phase B Multistep Flow Actions",
  "summary": "Behavior specs for the Phase B multistep event dispatcher, covering all action types including flow, branch, confirm, validate, delay, api, and invoke. Tests also verify backwards compatibility with the legacy flat-array dispatch pattern and enforce nesting depth limits.",
  "concepts": [
    "EventDispatcher",
    "FlowAbortError",
    "flow actions",
    "phase B",
    "backwards compat",
    "validate",
    "branch",
    "confirm",
    "api chaining",
    "invoke",
    "delay",
    "fake timers",
    "MAX_FLOW_DEPTH",
    "on_error",
    "ResolverContext"
  ],
  "categories": [
    "testing",
    "event-system",
    "flow-actions",
    "test"
  ],
  "source_docs": [
    "485b7af648efd26d"
  ],
  "backlinks": null,
  "word_count": 629,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite validates `EventDispatcher` — Ripple's core event execution engine for multi-step declarative actions. It was written to specify Phase B behavior: the addition of composite flow actions on top of the original flat-array primitive dispatch.

## Test Helpers

A `setup()` factory function creates a self-contained test environment each time:

```typescript
function setup(initial: Record<string, unknown> = {}, onEvent?: OnEventCallback) {
  const state = createStateManager(initial);
  const registry = new WidgetRegistry();
  const dispatcher = new EventDispatcher(state, onEvent, registry);
  const ctx = (): ResolverContext => ({ state: state.state });
  return { state, registry, dispatcher, ctx };
}
```

This isolation pattern prevents cross-test state bleed and keeps each test self-documenting.

## Legacy Primitives (Backwards Compat)

The first describe block guards the original flat-array behavior. Key cases:

- A flat array of `[set, emit, toast]` dispatches all three in order
- A single non-array handler (not wrapped in `[]`) still dispatches correctly
- The `open` action sets a boolean `true` on the target state key
- String values in `set` resolve `{state.x}` template expressions before writing

These tests prevent regression when the dispatcher internals are refactored for new flow action support.

## Flow Actions

### `flow` — Sequential Multi-Step Execution

Tests confirm steps execute in declared order. A critical test builds `MAX_FLOW_DEPTH + 1` nested flows and expects a rejection:

```typescript
await expect(dispatcher.dispatch(innermost, ctx())).rejects.toThrowError(
  /flow nesting depth exceeded/
);
```

The inverse test — nesting at exactly `MAX_FLOW_DEPTH` — must succeed. This pair prevents both runaway recursion and overly conservative depth enforcement.

### `branch` — Conditional Routing

Tests cover truthy/falsy condition evaluation and the edge case of a falsy condition with no `else` branch (must be a no-op, not a throw).

### `validate` — Guard Steps

- Passes silently when the condition is truthy (no toast fired)
- On failure: emits a toast via `onEvent`, skips subsequent steps, and the `FlowAbortError` is swallowed at the top level
- A `variant` override is forwarded to the toast event
- Integration test confirms `FlowAbortError` surfaces to an enclosing `flow`'s `on_error` handler

### `delay` — Timer Suspension

Uses `vi.useFakeTimers()`. Confirms that the step after a `delay` is not run until the timer advances, verifying the `flow` step order is preserved.

### `api` — Async Host Chaining

Five cases test the full RippleEventResult contract:

| Scenario | Expected behavior |
|---|---|
| Host returns `{ ok: true, data }` | `response_key` written; `on_success` chain runs |
| Host returns `{ ok: false, error }` | `_flow_error` written; `on_error` chain runs |
| Host returns `void` (legacy) | `on_success` still runs; `response_key` skipped (no data) |
| Host throws synchronously | Treated as error result; `on_error` chain runs |
| URL/body contain `{state.x}` | Expressions resolved before the event is emitted |

### `invoke` — Widget Method Calls

- Registered method is invoked with the correct args
- Async methods are awaited so the subsequent step in a flow runs after completion
- Unknown target logs a warning but does **not** abort the flow (resilience over strictness)
- String args with `{state.x}` expressions are resolved before calling

### `confirm` — User Confirmation Suspension

Uses `CONFIRM_STATE_KEY` and `CONFIRM_STATE_KEY` constants. Tests verify:

1. The pending record is written to state before the user responds
2. `resolveConfirm(id, 'confirm')` resumes the promise and runs `on_confirm`
3. `resolveConfirm(id, 'cancel')` runs `on_cancel` (or no-ops if `on_cancel` omitted)
4. The `_ripple_confirm` key is always cleared after resolution (prevents stuck dialogs)
5. `resolveConfirm` on an unknown id returns `false`

### `FlowAbortError` Class

Simple unit test verifying `reason`, `context`, and `name` fields are set correctly.

## Known Gaps

No explicit TODO or FIXME markers in the test file. However, there are no tests for concurrent dispatch (two flows dispatched simultaneously) or for the interaction between `confirm` suspension and `delay` steps within the same flow.
