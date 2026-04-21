// streaming/index.ts — Barrel for the streaming entrypoint.
// Consumed via `@ripple-ui/svelte/streaming`. Pulls in partial-json, so
// this module is deliberately isolated from the base bundle.
// Created: 2026-04-16

export { streamSpec } from './stream-spec.svelte.js';
export {
  StreamParseError,
  type StreamParseErrorKind,
  type StreamSpec,
  type StreamSpecOptions,
  type StreamSpecStore,
} from './types.js';
