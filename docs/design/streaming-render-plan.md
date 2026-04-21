# Streaming Render — Implementation Plan (Issue #15)

Status: approved for implementation
Approach: `partial-json` (Promplate) feeding Ripple's `spec` prop via Svelte 5 reactivity
Track: local-only branch `feat/streaming-render` — no push, no PR until captain review

## Goal

Agents generate UI specs via LLM streaming. Users currently see a blank screen for 3–5 seconds until the JSON completes. This plan makes the UI grow progressively as tokens arrive, with a minimal blank window and no flicker.

## Why `partial-json`

- Parses incomplete JSON to the deepest valid subtree without inventing structure (unlike `jsonrepair`, which guesses).
- Active maintenance, TypeScript types, ~10 kB, browser/Node/Bun compatible. The similarly named `partial-json-parser` is 7 years stale; do not use it.
- Accepts `Allow.*` flags for granular control over which partial types to surface (STR, NUM, ARR, OBJ).
- No backend changes required; no API breakage for non-streaming callers.

## Current pipeline

`spec` enters `Ripple.svelte:21`. A `$derived` at line 38 calls `normalizeSpec()` (`src/lib/core/normalizer.ts:8-46`), which is pure and throw-safe: it guards on `!input || typeof input !== 'object'` and on missing `input.ui`, falling back to an empty container. A second `$derived.by` at lines 55–59 picks a render mode (`'dashboard'`, `'node'`, or `'empty'`). In `'node'` mode, `NodeRenderer` (`src/lib/components/NodeRenderer.svelte`) recursively walks the `UINode` tree — `getWidget(node.type)` at line 104 looks up the component; unknown types render a red error at lines 260–263.

**Plug-in point:** the `spec` prop itself. Svelte reactivity re-renders the whole tree when `spec` changes — no extra wiring needed at the MVP level.

**Safety analysis on a partial input like `{ "version": "1.0", "ui": { "type": "flex", "chi`:** `partial-json` with `Allow.OBJ | Allow.ARR` drops the incomplete key and returns `{ version: "1.0", ui: { type: "flex" } }`. `normalizeSpec` wraps it as a UniversalSpec with an empty-children flex container. Renders as an empty flex. Safe.

**Risk the plan mitigates:** a truncated *value* like `{ "type": "fl" }` hits the red "Unknown widget type" error. Mitigation: the wrapper enables `Allow.STR` but strips truncated values for enum-like keys (`type`, `intent`, `version`, `action`, `variant`) via a post-filter — see the `json-parse.ts` wrapper in section 3. Text content streams progressively (nice for chat-style apps); enum fields stay safe.

## Package structure

### Subpath export

`package.json` currently has a single `"."` export. Add:

```json
"./streaming": {
  "types": "./dist/streaming/index.d.ts",
  "svelte": "./dist/streaming/index.js",
  "default": "./dist/streaming/index.js"
}
```

`svelte-package` mirrors `src/lib/` into `dist/`, so `src/lib/streaming/index.ts` compiles to `dist/streaming/index.js`. **Verify with a trial `bun run build` before writing the library** — if the subpath doesn't resolve, swap to a re-export from the main barrel.

### File layout

```
src/lib/streaming/
  index.ts                      # barrel — exports streamSpec, StreamSpecStore, StreamParseError
  stream-spec.ts                # core helper — accumulates, parses, emits
  json-parse.ts                 # wrapper over partial-json with enum-key post-filter
  types.ts                      # StreamSpecOptions, StreamSpecStore, StreamParseError
  stream-spec.test.ts           # unit tests (vitest)
  stream-spec.sim.test.ts       # real-world simulation harness
  stream-spec.smoke.test.ts     # smoke: bundle imports, registry resolves, no throw
  fixtures/
    simple-form.json            # small spec — baseline
    nested-dashboard.json       # dashboard path with slots
    deep-children.json          # 4-level nesting with each/if blocks
    chat-widget-stream.json     # realistic multi-widget chat response (synthesized to match real LLM output patterns)
    truncated-corpus.json       # known-bad chunks from edge cases: mid-unicode, mid-string, mid-key

src/lib/widgets/display/Skeleton.svelte   # MVP — shown before first valid parse

docs/streaming.md                         # public API doc, caveats, recipes
docs/design/streaming-render-plan.md      # this file
```

Total: 10 new files + 3 modified (`package.json`, `Ripple.svelte`, `widgets/index.ts`).

## `streamSpec()` API

### Signature

```ts
// Svelte 5 runes-only per CLAUDE.md. No Svelte 4 Readable.
export interface StreamSpecStore {
  /** Current deepest-valid spec, or null if nothing has parsed yet. Reactive ($state-backed). */
  readonly current: UniversalSpec | UISpec | null;
  /** True once the source stream has ended (naturally, via cancel, or via error). */
  readonly done: boolean;
  /** Non-null if the stream errored or parsing exhausted. Preserves last good `current`. */
  readonly error: StreamParseError | null;
  /** Cancel the in-flight stream. Idempotent. */
  cancel(): void;
}

export function streamSpec(
  source: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  options?: StreamSpecOptions
): StreamSpecStore;

export interface StreamSpecOptions {
  /**
   * Minimum ms between parse attempts. Default 50ms — tied to human perception,
   * not frame rate. Raise for choppy networks, lower for internal testing.
   */
  throttleMs?: number;

  /**
   * Max buffered bytes before emitting StreamOverflowError and cancelling.
   * Default 2_000_000 (2 MB) — generous for UI specs, protects against runaway streams.
   */
  maxBufferBytes?: number;

  /**
   * partial-json Allow flags. Default: Allow.OBJ | Allow.ARR | Allow.STR with
   * internal post-filtering that drops truncated values for enum-like keys
   * (type, intent, version, action, variant). Override only for testing.
   */
  allow?: number;

  /** Caller-driven cancellation. */
  signal?: AbortSignal;

  /** Called once per new emission. Useful for logging, metrics, debouncing downstream. */
  onUpdate?: (spec: UniversalSpec | UISpec) => void;
}

export class StreamParseError extends Error {
  readonly kind: 'malformed' | 'incomplete' | 'overflow' | 'aborted';
  readonly lastValid: UniversalSpec | UISpec | null;
}
```

### Internal flow

1. Initialize `buffer = ''`, `emissionCount = 0`, `lastParseAt = 0`, `previous = null`.
2. For each chunk from the source:
   - Decode if `Uint8Array` (use `TextDecoder` in stream mode for multi-byte safety across chunk boundaries).
   - Append to `buffer`.
   - If `buffer.length > maxBufferBytes`, emit `StreamOverflowError`, call `source.cancel?.()`, set `done = true`, return.
   - If `now() - lastParseAt < throttleMs`, skip parse (wait for next chunk).
   - Parse: `partial-json.parse(buffer, Allow.OBJ | Allow.ARR | Allow.STR)`.
   - Apply enum-key post-filter: walk the parsed tree, strip any string value where the key is in the enum-blocklist AND the raw text in `buffer` shows the value is at the buffer boundary (indicating truncation).
   - If parse throws (rare with our Allow flags), catch and keep `previous` — don't propagate mid-stream.
   - If the new parse is structurally different from `previous`, write to `store.current`, increment `emissionCount`, call `onUpdate?.(newSpec)`.
3. On source end:
   - Final parse attempt with full `Allow.ALL`.
   - If buffer is still not valid JSON, set `store.error = new StreamParseError('incomplete', previous)`.
   - Set `done = true`.
4. On source error:
   - Set `store.error = new StreamParseError('malformed', previous)`.
   - Set `done = true`.

### Structural equality

Use a shallow-depth tree hash (node count + leaf signature) to dedupe emissions without full structural comparison on every chunk. Full structural equality in JavaScript for a 50-node tree is ~20µs; tree hash is ~2µs. Over a 2-second stream at the default throttle, savings matter.

If the dedupe optimization complicates the first implementation, skip it — emit on every successful parse. Svelte's `$derived` memoizes downstream.

## Ripple component integration (MVP)

The MVP includes both the helper AND a minimal Ripple integration so the blank-window problem is actually solved, not just deferred. Skeleton is a real widget.

### Ripple.svelte changes

Add to the `Props` interface (around line 20–27):
```ts
streaming?: StreamSpecStore;
skeleton?: 'card' | 'dashboard' | 'text' | 'none';
```

Behavior:
- If `streaming` is provided and `streaming.current == null`, render the skeleton widget corresponding to `skeleton` (default `'card'`).
- If `streaming` is provided and `streaming.current != null`, use `streaming.current` as the spec (ignore any explicit `spec` prop).
- If only `spec` is provided, behave as today.
- When `streaming.done && streaming.error`, render a muted `<div class="ripple-stream-error">` with the last valid spec above and a small footer showing the error kind. Don't throw.

Change the `spec` derivation (line 38) to:
```ts
const resolvedSpec = $derived(streaming?.current ?? rawSpec);
const spec = $derived(normalizeSpec(resolvedSpec));
```

Add a `'skeleton'` mode to `renderMode` (lines 55–59):
```ts
if (streaming && !streaming.current) return 'skeleton';
```

Add a `{:else if renderMode === 'skeleton'}` branch in the render block.

### Skeleton widget

`src/lib/widgets/display/Skeleton.svelte` — no shadcn primitive exists. Inline:

```svelte
<script lang="ts">
  interface Props {
    variant?: 'card' | 'dashboard' | 'text' | 'none';
  }
  let { variant = 'card' }: Props = $props();
</script>

{#if variant === 'none'}
  <!-- render nothing — for callers who handle loading state externally -->
{:else if variant === 'text'}
  <div class="animate-pulse space-y-2 p-4">
    <div class="h-4 bg-muted rounded w-3/4"></div>
    <div class="h-4 bg-muted rounded w-1/2"></div>
  </div>
{:else if variant === 'dashboard'}
  <div class="animate-pulse grid grid-cols-3 gap-3 p-4">
    {#each Array(6) as _}
      <div class="h-24 bg-muted rounded"></div>
    {/each}
  </div>
{:else}
  <!-- card: default -->
  <div class="animate-pulse rounded-lg border border-border p-4 space-y-3">
    <div class="h-5 bg-muted rounded w-1/3"></div>
    <div class="h-4 bg-muted rounded w-full"></div>
    <div class="h-4 bg-muted rounded w-5/6"></div>
  </div>
{/if}
```

Register in `src/lib/widgets/index.ts` under key `skeleton`.

## Testing strategy — unit + e2e + smoke + real-world simulation

Vitest is configured (`vitest.config.ts`). Zero existing tests — **this PR establishes the pattern.** Colocate `*.test.ts` next to the module under test.

### Unit tests (`stream-spec.test.ts`)

- Empty stream → `current: null`, `done: true`, no error.
- Whitespace-only stream → same as empty.
- Stream of a single valid JSON in one chunk → `current` equals `JSON.parse(chunk)`.
- Stream of a valid JSON shredded into 1-byte, 8-byte, and random-sized chunks → final `current` equals full parse in all three cases.
- Stream rejects → `error.kind === 'malformed'`, `error.lastValid === previous`, `done: true`.
- Overflow: feed 3 MB of garbage → `error.kind === 'overflow'`, buffer not retained.
- Cancel mid-stream → `done: true`, no further emissions.
- AbortSignal triggered → same as cancel.
- Truncated enum-like key (`"type": "fl`) → NOT surfaced in `current` (post-filter drops it).
- Truncated text prop (`"text": "Hello wor`) → surfaced as `"text": "Hello wor"` (progressive reveal).
- `onUpdate` called once per new emission; not called on duplicate parses.
- Throttle: `throttleMs: 0` vs `throttleMs: 100` with fast chunks → emission counts differ as expected.

### Real-world simulation (`stream-spec.sim.test.ts`)

The most important suite. Goals:
1. Assert no "Unknown widget type" error flashes during progressive render.
2. Assert every intermediate spec is a valid `UniversalSpec | UISpec` per Zod.
3. Assert node counts are monotonically non-decreasing.
4. Assert final emitted spec equals non-streaming render.

Pattern:
- Read each fixture under `fixtures/`.
- Shred into variable-sized chunks with LLM-like cadence (20–80ms inter-chunk delays, occasional 300ms pauses, mid-word breaks).
- Feed through an async iterable to `streamSpec`.
- Collect every `onUpdate` emission.
- Run assertions on the full sequence.

Fixture corpus (see `src/lib/streaming/fixtures/`):
- `simple-form.json` — minimal card + input baseline.
- `nested-dashboard.json` — realistic 3-column dashboard with metrics and charts.
- `deep-children.json` — 4-level nesting with `each` and `if` blocks, 20+ children.
- `chat-widget-stream.json` — realistic multi-widget chat response (source-cards, follow-ups, inline citations) that mirrors the PocketPaw pocket_chat_stream output shape.
- `truncated-corpus.json` — catalogue of known-bad chunk boundaries: mid-unicode, mid-string, mid-key, mid-number, mid-true/false/null, unclosed array.

Fixtures are synthesized to match real LLM output patterns (not captured from a live run — PocketPaw doesn't have persisted traces yet). If PocketPaw later exposes a recorded trace, the simulation harness can swap in the real recording with no code changes.

### Smoke tests (`stream-spec.smoke.test.ts`)

- Import `streamSpec` from `@ripple-ui/svelte/streaming` (resolves the subpath export).
- Create a store, cancel immediately, assert no errors.
- Register `skeleton` widget, look it up in the registry, assert it's defined.
- `bun run build` succeeds (run as a pre-test hook, not a test assertion).

### Manual verification checklist (recorded in PR body)

- Run `bun run dev`, open the playground at `/`, paste a chunked stream into a test harness component, eyeball progressive render with Chrome DevTools throttling set to "Slow 3G".
- Verify skeleton shows for <100ms on fast streams, <500ms on throttled streams.
- Verify no widget "Unknown widget type" flashes at any point.
- Verify final spec tree matches the non-streaming render (open both in side-by-side tabs).

## File manifest

| File | Status | Purpose |
|------|--------|---------|
| `package.json` | modified | Add `partial-json` dep + `./streaming` subpath export |
| `src/lib/streaming/index.ts` | new | Barrel export |
| `src/lib/streaming/stream-spec.ts` | new | Core `streamSpec()` implementation |
| `src/lib/streaming/json-parse.ts` | new | `partial-json` wrapper + enum-key post-filter |
| `src/lib/streaming/types.ts` | new | `StreamSpecStore`, `StreamSpecOptions`, `StreamParseError` |
| `src/lib/streaming/stream-spec.test.ts` | new | Unit tests |
| `src/lib/streaming/stream-spec.sim.test.ts` | new | Real-world simulation |
| `src/lib/streaming/stream-spec.smoke.test.ts` | new | Smoke tests |
| `src/lib/streaming/fixtures/simple-form.json` | new | Baseline fixture |
| `src/lib/streaming/fixtures/nested-dashboard.json` | new | Dashboard path fixture |
| `src/lib/streaming/fixtures/deep-children.json` | new | Deep-nesting stress fixture |
| `src/lib/streaming/fixtures/chat-widget-stream.json` | new | Multi-widget chat fixture |
| `src/lib/streaming/fixtures/truncated-corpus.json` | new | Chunk-boundary edge cases |
| `src/lib/widgets/display/Skeleton.svelte` | new | MVP skeleton widget |
| `src/lib/widgets/index.ts` | modified | Register Skeleton |
| `src/lib/Ripple.svelte` | modified | `streaming` + `skeleton` props |
| `docs/streaming.md` | new | Public API doc |

Total: 15 new, 3 modified = 18 files. Above the 10-file "nice to keep under" target, but the testing and fixtures are the bulk (7 of 15 new files). The library proper is only 4 code files + types.

## Risks and mitigations

**1. Truncated enum-key flashes.** A truncated `"type": "fl` value could still slip past the post-filter if the buffer boundary lands between the key and the colon (partial-json surfaces the key without a value, but partial string detection is heuristic). Mitigation: the post-filter checks the character-index of the truncated value against the buffer length. If they're within a small margin (e.g., last 32 bytes), strip the field. Tested by `truncated-corpus.json`.

**2. Reactivity churn.** Every parse emission triggers `normalizeSpec` + NodeRenderer re-walk. At 50ms throttle that's 20 emissions/second. For a 50-node tree, `$derived.by` lazy evaluation handles it — validate in the simulation suite. If we see jank, add a structural equality check before writing `store.current` (plan has this as optional).

**3. Browser vs Node stream compat.** `fetch()` returns `ReadableStream<Uint8Array>` in browser; Node `Readable` streams are different. Mitigation: the helper accepts `ReadableStream | AsyncIterable<string | Uint8Array>`. Node callers can use `Readable.toWeb()` or wrap in a simple `for await`. Documented in `docs/streaming.md`.

**4. State preservation during mid-stream re-render.** If a streamed spec updates an `input` widget's props while a user is typing, does StateManager preserve keystrokes? Answer: no — each emission rebuilds the widget tree. Documented as a Phase 2 concern. For now: streaming is intended for display-first renders, not mid-interaction updates.

**5. Subpath export build-check.** `svelte-package` may not emit `dist/streaming/index.d.ts` automatically. Mitigation: run a trial `bun run build` before writing the library code; if types don't resolve, fall back to re-exporting from the main barrel.

## Open questions tracked for Phase 2

- Mid-stream state preservation (risk #4 above)
- A `streamingStatus` signal for fine-grained progress (useful for UI chrome like progress bars)
- SSE frame unwrapping helper (if PocketPaw exposes SSE rather than raw chunks)
- `onStreamError` recovery callback (caller supplies a retry stream)
- Dev playground route at `/routes/showcase/streaming/` — defer to a follow-up PR focused on demos

## Definition of done for the MVP PR

- [ ] All 15 new files created, 3 modified files updated.
- [ ] `bun run check` passes without new typecheck regressions (56 pre-existing errors on main).
- [ ] `bun run test` passes all unit + sim + smoke suites.
- [ ] `bun run build` emits `dist/streaming/index.{js,d.ts}` correctly.
- [ ] `docs/streaming.md` covers public API + at least one copy-paste recipe.
- [ ] The simulation suite proves no "Unknown widget type" flashes across all fixtures.
- [ ] Manual verification checklist run once, noted in the local commit.
- [ ] Commit locally on `feat/streaming-render`. Do NOT push, do NOT open PR — captain reviews the branch locally first.

## Execution plan

Two-stage, sequential (not parallel — fixtures and sims depend on the library being built):

**Stage 1 — Core + skeleton + unit tests (one agent):**
- Everything in `src/lib/streaming/` except `.sim.test.ts`
- `src/lib/widgets/display/Skeleton.svelte` + registry entry
- `src/lib/Ripple.svelte` changes
- `package.json` dep + subpath export
- `stream-spec.test.ts` unit suite
- `docs/streaming.md` draft
- Commit locally.

**Stage 2 — Fixtures + real-world sim + smoke (one agent):**
- All 5 fixture JSON files
- `stream-spec.sim.test.ts` real-world simulation harness
- `stream-spec.smoke.test.ts` smoke suite
- Run all tests, verify green
- Commit locally.

Parent coordinates both stages, reviews output, and presents the final branch to the captain.
