---
{
  "title": "Streaming Types — StreamSpecStore, StreamParseError, and Options",
  "summary": "This module defines the public TypeScript contract for the streaming layer: the reactive store interface, a structured error class with kind discrimination and last-valid-spec preservation, and the options bag that controls throttling, buffer limits, cancellation, and update callbacks.",
  "concepts": [
    "StreamSpec",
    "StreamParseError",
    "StreamParseErrorKind",
    "StreamSpecStore",
    "StreamSpecOptions",
    "lastValid",
    "throttleMs",
    "maxBufferBytes",
    "AbortSignal",
    "onUpdate",
    "cancel",
    "partial-json Allow flags",
    "reactive store interface"
  ],
  "categories": [
    "streaming",
    "schema",
    "state-management"
  ],
  "source_docs": [
    "1c25106f229b0ad2"
  ],
  "backlinks": null,
  "word_count": 564,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/types.ts` is the public type surface of the streaming module. It contains no logic — only type declarations and one class. Separating types from implementation (`stream-spec.svelte.ts`) serves two purposes: consumers who only need the TypeScript types can import from `types.ts` without pulling in `partial-json` or Svelte rune dependencies, and the types can be used in test files without triggering Svelte-specific compilation.

## StreamSpec

```typescript
export type StreamSpec = UniversalSpec | UISpec;
```

A union of both spec generations. The streaming engine does not distinguish between Gen 1 and Gen 2 at parse time — it emits whatever the partial-json parse produces and lets the renderer's `normalizeSpec` canonicalize it. The union type communicates to consumers that either format may arrive.

## StreamParseErrorKind

```typescript
export type StreamParseErrorKind = 'malformed' | 'incomplete' | 'overflow' | 'aborted';
```

Four discriminated failure modes:

- `'malformed'` — the source threw an exception during consumption (network error, unexpected close)
- `'incomplete'` — stream ended normally but no valid parse was ever produced (e.g., empty body or non-JSON response)
- `'overflow'` — buffer exceeded `maxBufferBytes` limit
- `'aborted'` — reserved for signal-driven cancellation (currently set via the `cancel` path)

## StreamParseError

```typescript
export class StreamParseError extends Error {
  readonly kind: StreamParseErrorKind;
  readonly lastValid: StreamSpec | null;
  constructor(kind, lastValid, message?) { ... }
}
```

Extends `Error` for standard stack-trace and `instanceof` support. The `lastValid` field is the most important addition: it holds the deepest successfully-parsed spec before the error occurred. Hosts can use this to:

- Show a partial UI rather than a blank error screen
- Log how far the LLM got before the failure
- Retry from the last-valid checkpoint

## StreamSpecStore

```typescript
export interface StreamSpecStore {
  readonly current: StreamSpec | null;
  readonly done: boolean;
  readonly error: StreamParseError | null;
  cancel(): void;
}
```

All fields are `readonly` — the store is consumed, not mutated by callers. The three state fields form a state machine:

| current | done | error | Meaning |
|---|---|---|---|
| null | false | null | Stream in progress, no valid parse yet |
| spec | false | null | Stream in progress, partial spec available |
| spec | true | null | Stream completed successfully |
| any | true | error | Stream ended with error |

The `cancel()` method is the only write path available to consumers, and it is idempotent in the implementation.

## StreamSpecOptions

```typescript
export interface StreamSpecOptions {
  throttleMs?: number;      // default 50
  maxBufferBytes?: number;  // default 2_000_000
  allow?: number;           // partial-json Allow flags
  signal?: AbortSignal;
  onUpdate?: (spec: StreamSpec) => void;
}
```

`throttleMs: 50` is documented as tied to human perception of staleness rather than the browser frame rate (16ms). The distinction matters: 60fps repaints are wasted if the content hasn't meaningfully changed — 20Hz partial parses are the practical ceiling for UI spec updates.

`allow` exposes the raw `partial-json` bitflag for testing overrides. In production, the default is always used with the enum-key post-filter applied on top.

`onUpdate` fires synchronously within the consume loop on each new emission. It is useful for logging and for downstream debouncing in hosts that want to further throttle rendering.

## Known Gaps

- `'aborted'` kind is defined but the current implementation uses `cancel()` for all cancellation paths including AbortSignal — there is no code path that sets `kind = 'aborted'` distinctly from the other termination modes.