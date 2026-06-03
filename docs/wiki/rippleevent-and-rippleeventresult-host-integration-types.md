---
{
  "title": "RippleEvent and RippleEventResult — Host Integration Types",
  "summary": "These two types define the contract between Ripple's internal event dispatcher and the host application. `RippleEvent` carries the payload for every host-delegated action; `RippleEventResult` carries the host's response back to enable async continuation chains (on_success / on_error) for API actions.",
  "concepts": [
    "RippleEvent",
    "RippleEventResult",
    "host-delegated",
    "onEvent callback",
    "api action",
    "on_success",
    "on_error",
    "response_key",
    "async chaining",
    "backwards compatibility",
    "void return",
    "event dispatcher",
    "host integration"
  ],
  "categories": [
    "schema",
    "events",
    "integration"
  ],
  "source_docs": [
    "6162657ff5e907d6"
  ],
  "backlinks": null,
  "word_count": 460,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/types.ts` defines the boundary types that cross the Ripple/host integration surface. Ripple is an embedded rendering engine — it does not perform HTTP requests, navigate browsers, or show notifications directly. Instead, it emits `RippleEvent` objects to a host-provided `onEvent(event)` callback, and the host acts on them. This design keeps Ripple portable across host environments (React apps, Next.js, mobile WebViews, CLI tools) without coupling to any specific platform.

## RippleEvent

```typescript
export type RippleEvent = {
  type: 'api' | 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin';
  url?: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  target?: string;
  message?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  name?: string;
  payload?: unknown;
};
```

All fields except `type` are optional because different action types use different subsets:

- `api` uses `url`, `method`, `body`, `headers`
- `navigate` uses `url`
- `toast` uses `message`, `variant`
- `emit` uses `target`, `payload`
- `pin` / `unpin` use `target`, `payload`

The flat shape (rather than a discriminated union) was a deliberate backwards-compatibility choice — hosts written before the type was strictly defined often accessed `event.url` without checking `event.type`. A discriminated union would require host-side type narrowing.

`name` is an alias/legacy field for `emit` actions that carried an event name. It is not used by current dispatcher code but is preserved to avoid breaking existing host integrations.

## RippleEventResult

```typescript
export type RippleEventResult = {
  ok: boolean;
  data?: unknown;
  error?: {
    message: string;
    status?: number;
    body?: unknown;
  };
};
```

This type was introduced alongside async chaining in the `api` action handler. When a host's `onEvent` returns a `RippleEventResult`, the dispatcher reads `ok` to decide whether to run `on_success` or `on_error` steps, and writes `data` into state under the `response_key` if the spec provided one.

Hosts returning `void` (the pre-chaining contract) are treated as silent success — no error fires, no response body is written. This backwards compatibility guarantee is documented in both this file and in `event-handler.ts`. Without it, every existing host integration would need to be updated to return a result object.

## Why Shared Types Live Here

Both Ripple's event dispatcher and host integration documentation need access to these types. Placing them in `lib/types.ts` (separate from the schema folder) signals that they are runtime integration types, not spec validation schemas. They do not use Zod — there is no parse/validate step for event results because the host is trusted to return correct shapes.

## Known Gaps

- `RippleEvent.type` omits `'set'`, `'open'`, `'flow'`, `'branch'`, `'confirm'`, `'validate'`, `'delay'`, and `'invoke'` — these event action types are handled entirely within the Ripple dispatcher and never emitted to the host. The type union accurately reflects only host-delegated actions.
- The `name` field has no documentation comment explaining its origin or deprecation status.