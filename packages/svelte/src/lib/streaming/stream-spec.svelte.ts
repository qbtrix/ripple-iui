// stream-spec.svelte.ts — Core streamSpec() helper.
// Uses Svelte 5 $state for reactivity so consumers see automatic updates
// via `$derived(store.current)` or bare access inside components.
// Partial parses are throttled on both edges: a chunk that lands inside the
// window gets one parse when the window closes, so a pausing stream never
// leaves `current` behind the text already received. The single pending
// timer is cleared on every exit (done, cancel/abort/overflow, error).
// In dev, a stream whose buffer passes `warnAtBytes` gets one console.warn
// per stream: that size usually means data typed inline.

import { StreamParseError, type StreamSpec, type StreamSpecOptions, type StreamSpecStore } from '$lib/streaming/index.js';
import { DEFAULT_ALLOW, parsePartialSpec } from './json-parse.js';
import { DEV } from 'esm-env';

const DEFAULT_THROTTLE_MS = 50;
const DEFAULT_MAX_BUFFER_BYTES = 2_000_000;
const DEFAULT_WARN_AT_BYTES = 100_000;

export function streamSpec(
  source: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  options: StreamSpecOptions = {},
): StreamSpecStore {
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES;
  const allow = options.allow ?? DEFAULT_ALLOW;
  const warnAtBytes = options.warnAtBytes ?? DEFAULT_WARN_AT_BYTES;
  let warnedLarge = false;

  const state = $state({
    current: null as StreamSpec | null,
    done: false,
    error: null as StreamParseError | null,
  });

  let buffer = '';
  let lastParseAt = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let abortListenerCleanup: (() => void) | null = null;
  const decoder = new TextDecoder('utf-8', { fatal: false });

  const clearTrailing = () => {
    if (trailingTimer !== null) clearTimeout(trailingTimer);
    trailingTimer = null;
  };

  const finish = () => {
    clearTrailing();
    state.done = true;
    abortListenerCleanup?.();
  };

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    finish();
  };

  if (options.signal) {
    if (options.signal.aborted) {
      state.done = true;
      return makeStore(state, cancel);
    }
    const listener = () => cancel();
    options.signal.addEventListener('abort', listener);
    abortListenerCleanup = () => options.signal?.removeEventListener('abort', listener);
  }

  const parseNow = (): void => {
    clearTrailing();
    lastParseAt = nowMs();

    const result = parsePartialSpec(buffer, allow);
    if (result.value == null || typeof result.value !== 'object') return;

    const spec = result.value as StreamSpec;
    if (state.current !== spec) {
      state.current = spec;
      options.onUpdate?.(spec);
    }
  };

  // Leading edge parses now; inside the window, one trailing parse at its end.
  const tryEmit = (): void => {
    const wait = throttleMs - (nowMs() - lastParseAt);
    if (wait <= 0) parseNow();
    else if (trailingTimer === null) trailingTimer = setTimeout(parseNow, wait);
  };

  const consume = async (): Promise<void> => {
    try {
      const iter = toAsyncIterable(source);

      for await (const chunk of iter) {
        if (cancelled) break;

        const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        if (text.length === 0) continue;
        buffer += text;

        if (DEV && !warnedLarge && warnAtBytes > 0 && buffer.length > warnAtBytes) {
          warnedLarge = true;
          console.warn(
            `[ripple] streamed spec passed ${buffer.length} bytes (warnAtBytes: ${warnAtBytes}). ` +
              'Every frame re-parses the whole buffer, so large specs paint slowly. ' +
              'Load bulk data from the host through `sources` or an `api` action instead of typing it into the spec.',
          );
        }

        if (buffer.length > maxBufferBytes) {
          state.error = new StreamParseError(
            'overflow',
            state.current,
            `Buffer exceeded ${maxBufferBytes} bytes`,
          );
          cancel();
          return;
        }

        tryEmit();
      }

      if (cancelled) return;

      // Flush any buffered multi-byte sequence
      const tail = decoder.decode();
      if (tail) buffer += tail;

      parseNow();

      if (state.current === null && buffer.trim().length > 0) {
        state.error = new StreamParseError('incomplete', null, 'Stream ended before any valid parse');
      }
      finish();
    } catch (err) {
      if (cancelled) return;
      state.error = new StreamParseError(
        'malformed',
        state.current,
        err instanceof Error ? err.message : String(err),
      );
      finish();
    }
  };

  void consume();

  return makeStore(state, cancel);
}

function makeStore(
  state: { current: StreamSpec | null; done: boolean; error: StreamParseError | null },
  cancel: () => void,
): StreamSpecStore {
  return {
    get current() {
      return state.current;
    },
    get done() {
      return state.done;
    },
    get error() {
      return state.error;
    },
    cancel,
  };
}

function toAsyncIterable<T>(
  source: ReadableStream<T> | AsyncIterable<T>,
): AsyncIterable<T> {
  if (Symbol.asyncIterator in source) {
    return source as AsyncIterable<T>;
  }
  return readableToAsyncIterable(source as ReadableStream<T>);
}

async function* readableToAsyncIterable<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value !== undefined) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
