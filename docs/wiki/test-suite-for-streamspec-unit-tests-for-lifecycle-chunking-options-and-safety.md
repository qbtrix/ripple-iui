---
{
  "title": "Test Suite for streamSpec — Unit Tests for Lifecycle, Chunking, Options, and Safety",
  "summary": "This unit test suite provides systematic coverage of `streamSpec` across lifecycle edge cases, variable chunk sizes, configuration options, safety boundaries, and cross-environment compatibility. It uses controlled synthetic generators rather than real LLM output, giving precise control over timing and content to assert exact behavior.",
  "concepts": [
    "streamSpec",
    "unit test",
    "chunkStream",
    "shredString",
    "waitFor",
    "throttleMs",
    "maxBufferBytes",
    "AbortSignal",
    "cancel",
    "truncated enum",
    "ReadableStream",
    "Uint8Array",
    "TextEncoder",
    "parsePartialSpec",
    "lifecycle"
  ],
  "categories": [
    "streaming",
    "testing",
    "safety",
    "parsing",
    "test"
  ],
  "source_docs": [
    "ef9c345a162abf5e"
  ],
  "backlinks": null,
  "word_count": 554,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/stream-spec.test.ts` is the unit-level companion to the simulation suite. Where the simulation tests use realistic LLM-like randomness, these tests use fully deterministic inputs — fixed chunk arrays, precise delays, exact payload sizes — to pin down the behavior of each feature independently.

## Test Infrastructure

```typescript
async function* chunkStream(
  chunks: (string | Uint8Array)[],
  delayMs = 0
): AsyncGenerator<string | Uint8Array>

function shredString(s: string, chunkSize: number): string[]

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1000,
  stepMs = 5
): Promise<void>
```

`shredString` splits a JSON string into fixed-size slices for testing exact chunk-boundary behavior (e.g., a slice that cuts through a field name or string value). `chunkStream` yields those slices with configurable inter-chunk delay. `waitFor` polls a predicate until it returns true or times out, avoiding arbitrary `sleep()` calls that make tests fragile.

## Lifecycle Suite

- **Empty stream** — store ends with `current: null`, `done: true`, `error: null`. Confirmed that the store does not report an error for a cleanly empty source.
- **Whitespace-only stream** — treated identically to empty; whitespace is trimmed before the parse attempt.
- **Single complete JSON chunk** — confirms the final forced emit correctly surfaces the spec.

## Chunk Size Suite

`shredString` is used to produce slices of size 1, 4, and 17 bytes over the same fixture. All three must produce an identical final spec (`toMatchObject`). This covers: slices that cut mid-character (size 1 for ASCII is fine; Uint8Array tests cover multi-byte), slices that cut mid-key, mid-value, and mid-structural character.

## Options Suite

**throttleMs** — chunks arrive every 1ms with `throttleMs: 500`. At most 2 `onUpdate` emissions should fire (one intermediate, one forced final). This confirms the throttle actually suppresses intermediate parses rather than just delaying them.

**onUpdate** — with `throttleMs: 0` (no throttle), `onUpdate` must fire at least once. The test only checks `>= 1` because the exact count depends on how many partial parses succeed, which is content-dependent.

## Safety Suite

**Overflow** — a 30KB string is streamed with `maxBufferBytes: 15_000`. The store must report `error.kind === 'overflow'`.

**cancel() halts emissions** — chunks arrive every 10ms, `cancel()` fires after 5ms. The `updates` counter frozen at cancel time must match the counter 50ms later — proving no further callbacks fire after cancellation.

**AbortSignal** — an `AbortController` is created, chunks stream at 20ms delay, `controller.abort()` is called. The store must eventually reach `done: true`.

**Already-aborted signal** — `controller.abort()` before passing to `streamSpec`. The store must be `done: true` synchronously without consuming the source.

## Truncated Enum Safety Suite

These tests directly target `parsePartialSpec`'s enum-key filtering:

- A buffer ending in `"type":"fl` (open string) — `ui.type` must be `undefined` after parse.
- A buffer with `"type":"flex"` fully closed — `ui.type` must be `'flex'`.
- A buffer with an open `text` prop string — `type` is kept (closed), `props.text` may be a partial string or `undefined` (either is valid).

## ReadableStream Compatibility Suite

Two tests verify that `streamSpec` accepts `ReadableStream<string>` and `ReadableStream<Uint8Array>`. The Uint8Array test uses `TextEncoder` to produce encoded bytes, confirming the internal `TextDecoder` path works end-to-end.

## Known Gaps

- No test covers concurrent cancel + stream completion racing — both paths set `state.done = true` and one would win silently.
- The `onUpdate` lower bound (`>= 1`) is weak; a stricter test would assert a meaningful emission count based on known chunk boundaries.