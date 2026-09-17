// streaming/index.ts — Barrel for the streaming entrypoint.
// Consumed via `@ripple-ui/svelte/streaming`. Pulls in partial-json, so
// this module is deliberately isolated from the base bundle.
// Created: 2026-04-16

export { streamSpec } from './stream-spec.svelte.js';
// Progressive render for hosts that already accumulate the spec text (e.g. a
// chat message growing token-by-token) and so have a string, not a stream.
export { parsePartialSpec, DEFAULT_ALLOW, type ParseResult } from './json-parse.js';
export {
  StreamParseError,
  type StreamParseErrorKind,
  type StreamSpec,
  type StreamSpecOptions,
  type StreamSpecStore,
} from './types.js';
