---
{
  "title": "Streaming Module Barrel — Isolated Entry Point for LLM Streaming",
  "summary": "The streaming barrel exposes `streamSpec` and the public streaming types as a deliberately isolated sub-entry point (`@ripple-ui/svelte/streaming`). The isolation exists because this module pulls in `partial-json`, a dependency that should not be bundled into the base Ripple package for consumers who don't need streaming.",
  "concepts": [
    "streamSpec",
    "StreamParseError",
    "StreamSpecStore",
    "StreamSpecOptions",
    "StreamSpec",
    "partial-json",
    "bundle isolation",
    "sub-entry point",
    "streaming barrel",
    "tree-shaking"
  ],
  "categories": [
    "streaming",
    "module-organization"
  ],
  "source_docs": [
    "0eb1b75847b85b32"
  ],
  "backlinks": null,
  "word_count": 282,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/index.ts` is a minimal barrel with a specific architectural motivation — bundle isolation:

```typescript
// streaming/index.ts — Barrel for the streaming entrypoint.
// Consumed via `@ripple-ui/svelte/streaming`. Pulls in partial-json, so
// this module is deliberately isolated from the base bundle.

export { streamSpec } from './stream-spec.svelte.js';
export {
  StreamParseError,
  type StreamParseErrorKind,
  type StreamSpec,
  type StreamSpecOptions,
  type StreamSpecStore,
} from './types.js';
```

## Why a Separate Entry Point

`partial-json` is a non-trivial parser dependency needed only for progressive rendering of LLM output. Consumers who render only fully-formed specs (e.g., server-rendered or stored UISpec documents) should not pay the bundle cost. By placing the streaming code behind its own package export condition, bundlers can tree-shake the entire streaming subtree when the `@ripple-ui/svelte/streaming` sub-path is never imported.

This pattern mirrors how frameworks like SvelteKit expose `@sveltejs/kit/node` as a separate entry for Node-specific adapters — the split is a deliberate packaging choice, not a code organization preference.

## What Is Exported

**Function:**
- `streamSpec(source, options)` — the core reactive streaming helper

**Class:**
- `StreamParseError` — thrown/stored when the stream fails to parse

**Types (stripped at runtime):**
- `StreamParseErrorKind` — `'malformed' | 'incomplete' | 'overflow' | 'aborted'`
- `StreamSpec` — union of `UniversalSpec | UISpec`
- `StreamSpecOptions` — configuration object for `streamSpec`
- `StreamSpecStore` — reactive store interface returned by `streamSpec`

## Dependency Graph

```
lib/streaming/index.ts
  └── stream-spec.svelte.ts  (Svelte $state, partial-json via json-parse.ts)
  └── types.ts               (UISpec, UniversalSpec type imports only)
```

The barrel deliberately omits internal helpers like `parsePartialSpec`, `stripTruncatedEnums`, and `DEFAULT_ALLOW` from `json-parse.ts` — those are implementation details not part of the public API.

## Known Gaps

No known gaps specific to this barrel. Its correctness is entirely determined by the modules it re-exports.