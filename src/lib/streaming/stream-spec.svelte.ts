// stream-spec.svelte.ts — Core streamSpec() helper.
// Uses Svelte 5 $state for reactivity so consumers see automatic updates
// via `$derived(store.current)` or bare access inside components.
// Created: 2026-04-16

import {
  StreamParseError,
  type StreamSpec,
  type StreamSpecOptions,
  type StreamSpecStore,
} from './types.js';
import { DEFAULT_ALLOW, parsePartialSpec } from './json-parse.js';

const DEFAULT_THROTTLE_MS = 50;
const DEFAULT_MAX_BUFFER_BYTES = 2_000_000;

export function streamSpec(
  source: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  options: StreamSpecOptions = {},
): StreamSpecStore {
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES;
  const allow = options.allow ?? DEFAULT_ALLOW;

  const state = $state({
    current: null as StreamSpec | null,
    done: false,
    error: null as StreamParseError | null,
  });

  let buffer = '';
  let lastParseAt = 0;
  let cancelled = false;
  let abortListenerCleanup: (() => void) | null = null;
  const decoder = new TextDecoder('utf-8', { fatal: false });

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    state.done = true;
    abortListenerCleanup?.();
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

  const tryEmit = (force = false): void => {
    const now = nowMs();
    if (!force && now - lastParseAt < throttleMs) return;
    lastParseAt = now;

    const result = parsePartialSpec(buffer, allow);
    if (result.value == null || typeof result.value !== 'object') return;

    const spec = result.value as StreamSpec;
    if (state.current !== spec) {
      state.current = spec;
      options.onUpdate?.(spec);
    }
  };

  const consume = async (): Promise<void> => {
    try {
      const iter = toAsyncIterable(source);

      for await (const chunk of iter) {
        if (cancelled) break;

        const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        if (text.length === 0) continue;
        buffer += text;

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

      tryEmit(true);

      if (state.current === null && buffer.trim().length > 0) {
        state.error = new StreamParseError('incomplete', null, 'Stream ended before any valid parse');
      }
      state.done = true;
      abortListenerCleanup?.();
    } catch (err) {
      if (cancelled) return;
      state.error = new StreamParseError(
        'malformed',
        state.current,
        err instanceof Error ? err.message : String(err),
      );
      state.done = true;
      abortListenerCleanup?.();
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
