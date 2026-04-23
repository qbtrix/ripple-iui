// types.ts — Public types for the streaming module.
// Created: 2026-04-16

import type { UISpec } from '../schema/ui-spec.js';
import type { UniversalSpec } from '../schema/universal-spec.js';

export type StreamSpec = UniversalSpec | UISpec;

export type StreamParseErrorKind = 'malformed' | 'incomplete' | 'overflow' | 'aborted';

export class StreamParseError extends Error {
  readonly kind: StreamParseErrorKind;
  readonly lastValid: StreamSpec | null;

  constructor(kind: StreamParseErrorKind, lastValid: StreamSpec | null, message?: string) {
    super(message ?? `Stream parse ${kind}`);
    this.name = 'StreamParseError';
    this.kind = kind;
    this.lastValid = lastValid;
  }
}

/**
 * Reactive store exposed by streamSpec(). Access `current`, `done`, `error`
 * inside a Svelte component and the component re-renders on updates.
 */
export interface StreamSpecStore {
  /** Deepest valid spec parsed so far, or null until the first successful parse. */
  readonly current: StreamSpec | null;
  /** True once the source stream has ended (natural, cancel, or error). */
  readonly done: boolean;
  /** Non-null when parsing exhausted or the source errored. Preserves `lastValid`. */
  readonly error: StreamParseError | null;
  /** Cancels the in-flight source. Idempotent. */
  cancel(): void;
}

export interface StreamSpecOptions {
  /**
   * Minimum ms between parse attempts. Defaults to 50 — tied to human perception
   * of staleness rather than the browser's frame rate. Lower values produce more
   * intermediate renders; higher values feel laggier.
   */
  throttleMs?: number;

  /**
   * Max buffered bytes before emitting a StreamParseError('overflow') and
   * cancelling the source. Defaults to 2_000_000 (2 MB). Generous for real
   * UI specs; guards against runaway streams.
   */
  maxBufferBytes?: number;

  /**
   * partial-json Allow flags. Defaults to OBJ | ARR | STR with internal
   * post-filtering that drops truncated values for enum-like keys
   * (type, intent, version, action, variant) to avoid "Unknown widget type"
   * flashes during progressive render. Override only for testing.
   */
  allow?: number;

  /** Caller-driven cancellation. Aborting has the same effect as cancel(). */
  signal?: AbortSignal;

  /** Called once per new emission. Useful for logging and downstream debouncing. */
  onUpdate?: (spec: StreamSpec) => void;
}
