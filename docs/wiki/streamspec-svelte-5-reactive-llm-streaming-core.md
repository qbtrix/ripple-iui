---
{
  "title": "streamSpec — Svelte 5 Reactive LLM Streaming Core",
  "summary": "The `streamSpec` function is the runtime core of Ripple's streaming layer: it consumes a ReadableStream or AsyncIterable of string/binary chunks, progressively parses them as a partial JSON spec, and exposes the result as a Svelte 5 `$state`-backed reactive store. Components reading `store.current` automatically re-render as each new partial parse succeeds.",
  "concepts": [
    "streamSpec",
    "Svelte 5 $state",
    "StreamSpecStore",
    "StreamSpecOptions",
    "throttleMs",
    "maxBufferBytes",
    "cancel",
    "AbortSignal",
    "toAsyncIterable",
    "ReadableStream",
    "AsyncIterable",
    "TextDecoder",
    "tryEmit",
    "buffer overflow",
    "progressive rendering"
  ],
  "categories": [
    "streaming",
    "rendering",
    "state-management"
  ],
  "source_docs": [
    "a7f25f5d5983a60c"
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

`lib/streaming/stream-spec.svelte.ts` is a Svelte 5 `.svelte.ts` file, meaning it can use Svelte runes (`$state`, `$derived`) despite not being a component. The `$state` rune gives `state.current`, `state.done`, and `state.error` reactive semantics — any Svelte component that reads these properties inside a reactive context will re-render automatically without an explicit subscription or writable store.

## API

```typescript
export function streamSpec(
  source: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  options: StreamSpecOptions = {}
): StreamSpecStore
```

Accepts both `ReadableStream` (Fetch API / browser) and `AsyncIterable` (Node.js, Vitest) as source types, enabling the same function to work in component code, server-side rendering, and tests without adapters.

## Throttling

```typescript
const DEFAULT_THROTTLE_MS = 50;
const tryEmit = (force = false): void => {
  const now = nowMs();
  if (!force && now - lastParseAt < throttleMs) return;
  ...
};
```

50ms is tied to human perception of staleness (roughly 20 Hz). Without throttling, every single character of LLM output would trigger a parse-and-reconcile cycle in Svelte, causing excessive rendering work. `tryEmit(true)` forces an emit at stream end regardless of the timer, ensuring the final state is always surfaced.

## Buffer Overflow Guard

The `maxBufferBytes` limit (default 2 MB) prevents a runaway or malicious stream from growing `buffer` unboundedly. On overflow, a `StreamParseError('overflow', ...)` is set and `cancel()` is called — the host gets the last valid spec via `error.lastValid` and can decide whether to show a partial result or an error UI.

## Cancel and AbortSignal

`cancel()` is idempotent via a `cancelled` flag — the first call sets `state.done = true` and cleans up the abort listener; subsequent calls return immediately. This is important because `cancel` may be called from multiple code paths (user action, component teardown, AbortSignal, overflow guard).

AbortSignal integration handles two cases: if the signal is already aborted at call time, the store is initialized in a done state without consuming the source at all. If aborted later, the abort listener fires `cancel()` and the consume loop exits on the next `if (cancelled) break` check.

## toAsyncIterable

```typescript
function toAsyncIterable<T>(
  source: ReadableStream<T> | AsyncIterable<T>
): AsyncIterable<T>
```

ReadableStreams do not implement `Symbol.asyncIterator` in all environments. This helper detects the interface and, for ReadableStreams, creates an `AsyncGenerator` that manually calls `reader.read()` and releases the lock in a `finally` block — ensuring the lock is always released even if the generator is abandoned before completion.

## nowMs

```typescript
function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
```

`performance.now()` is preferred for sub-millisecond accuracy in browser environments. The `Date.now()` fallback supports Node.js and test environments where the Performance API may not be present.

## Data Flow

1. Source (ReadableStream or AsyncIterable) → `toAsyncIterable`
2. Each chunk: decoded if `Uint8Array`, appended to `buffer`
3. `tryEmit` → `parsePartialSpec(buffer)` → `state.current = spec` (if changed)
4. `options.onUpdate?.(spec)` fires for each new emission
5. On stream end: flush decoder, force emit, set `state.done = true`

## Known Gaps

- The `TextDecoder` is initialized with `fatal: false` — malformed UTF-8 sequences are replaced with the replacement character rather than throwing. This is intentional for streaming robustness but means corrupted multi-byte sequences silently produce garbage characters in text content.