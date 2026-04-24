---
{
  "title": "Event Handler Schema — Widget Interaction Action Types",
  "summary": "This module defines the complete Zod schema for every action a widget can fire in response to user interaction. It covers simple side-effect actions (set state, navigate, toast) through to async flow control (sequential flows, conditional branches, confirmation dialogs, and API calls with on_success/on_error chaining).",
  "concepts": [
    "EventAction",
    "EventHandler",
    "EventHandlerOrArray",
    "SetHandler",
    "ApiHandler",
    "FlowHandler",
    "BranchHandler",
    "ConfirmHandler",
    "ValidateHandler",
    "InvokeHandler",
    "discriminated union",
    "z.lazy",
    "async chaining",
    "on_success",
    "on_error",
    "host-delegated"
  ],
  "categories": [
    "schema",
    "events",
    "state-management",
    "widget"
  ],
  "source_docs": [
    "5f4ff865ffec5a07"
  ],
  "backlinks": null,
  "word_count": 530,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/schema/event-handler.ts` is the contract layer between widget specs and Ripple's event dispatcher. Every `on_click`, `on_change`, `on_submit` etc. on a `UINode` holds a value validated against the schemas defined here. The file grew through several deliberate phases: simple synchronous actions first, then async API calls, then a full flow-control system (phase B).

## Action Taxonomy

`EventAction` is a Zod enum of 14 values, divided into two generations:

**Legacy actions** (synchronous, host-delegated):

| Action | Purpose |
|---|---|
| `set` | Write a value to a state path |
| `api` | Delegate HTTP request to host |
| `navigate` | Change URL via host |
| `toast` | Display notification |
| `emit` | Forward custom event to parent |
| `open` | Set state path to `true` (opens modals) |
| `pin` / `unpin` | Host-delegated bookmark operations |

**Flow actions** (phase B, support async chaining):

| Action | Purpose |
|---|---|
| `flow` | Sequential step execution |
| `branch` | Conditional then/else |
| `confirm` | User-confirmation gate |
| `validate` | Assertion with abort-on-fail |
| `delay` | Timed pause |
| `invoke` | Call a registered widget method |

## Schema Design: Discriminated Union

Each action has a distinct Zod object schema discriminated on the `action` literal. This means TypeScript narrows the type correctly after a `handler.action === 'api'` check — no casting required downstream.

Four schemas — `ApiHandler`, `FlowHandler`, `BranchHandler`, and `ConfirmHandler` — are **recursive**: they can contain arrays of `EventHandler` in `on_success`, `steps`, `then`/`else`, and `on_confirm`/`on_cancel`. Zod v4 does not support `z.discriminatedUnion` with `z.lazy` members, so these four are wrapped in `z.lazy` and the outer union uses `z.union` rather than `z.discriminatedUnion`. This is noted explicitly in the source comment to prevent future maintainers from switching to the discriminated form and breaking recursive validation.

```typescript
export const EventHandler = z.union([
  SetHandler, OpenHandler, NavigateHandler, ToastHandler,
  EmitHandler, PinHandler, UnpinHandler,
  ApiHandler,     // z.lazy — recursive
  FlowHandler,    // z.lazy — recursive
  BranchHandler,  // z.lazy — recursive
  ConfirmHandler, // z.lazy — recursive
  ValidateHandler, DelayHandler, InvokeHandler
]);
```

## API Handler and Async Chaining

The `api` action is host-delegated — Ripple emits the event to the host's `onEvent` callback and the host performs the HTTP request. The `response_key` field lets the response be written into Ripple's state tree, making it available to subsequent `set` or `branch` steps. `on_success` and `on_error` are themselves arrays of `EventHandler`, enabling full response-driven continuation chains.

Hosts that return `void` (pre-chaining, backwards-compatible) are treated as silent success — no continuation fires and no error is raised.

## EventHandlerOrArray

```typescript
export const EventHandlerOrArray = z.union([EventHandler, z.array(EventHandler)]);
```

This union preserves backwards compatibility: existing specs that use a single handler object on `on_click` still validate. New specs can provide an array for multi-action responses (e.g., `set` + `toast` on a single click).

## Known Gaps

- The `@created` jsdoc contains `2024-12-XX` — the exact creation date was not recorded.
- `validate` and `delay` are not yet wired into the flow executor (they are schema-valid but may be no-ops at runtime depending on dispatcher implementation).
- `invoke`'s `target` (widget id) requires the invoking widget to know sibling ids at spec-author time — there is no dynamic resolution mechanism.