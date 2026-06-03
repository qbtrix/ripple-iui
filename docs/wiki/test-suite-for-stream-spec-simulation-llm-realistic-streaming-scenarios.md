---
{
  "title": "Test Suite for Stream Spec Simulation — LLM-Realistic Streaming Scenarios",
  "summary": "This test suite validates `streamSpec` and `parsePartialSpec` under realistic LLM-like streaming conditions using a deterministic pseudo-random chunk generator and a set of representative fixture documents. It enforces four invariants across all fixtures: final output correctness, monotonically non-decreasing node counts, no truncated enum values leaking through, and all widget types resolving to registered components.",
  "concepts": [
    "streamSpec",
    "simulation test",
    "llmLikeStream",
    "mulberry32",
    "countNodes",
    "collectWidgetTypes",
    "runSim",
    "truncated-corpus",
    "fixture",
    "node count monotonicity",
    "enum leak prevention",
    "seeded PRNG",
    "deterministic testing",
    "progressive rendering"
  ],
  "categories": [
    "streaming",
    "testing",
    "parsing",
    "safety",
    "test"
  ],
  "source_docs": [
    "7970d6e82a9b3cdb"
  ],
  "backlinks": null,
  "word_count": 567,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/stream-spec.sim.test.ts` is a simulation-layer test suite designed to catch regressions that unit tests miss. LLMs do not deliver JSON in clean chunks — they produce variable-size fragments with jittered timing and occasional server-flush pauses. The simulation harness replicates this behavior deterministically using a seeded PRNG (`mulberry32`), making tests fast, repeatable, and CI-safe.

## llmLikeStream

```typescript
async function* llmLikeStream(full: string, seed = 1): AsyncGenerator<string>
```

Chunk sizes vary 4–30 bytes. Inter-chunk delays jitter 2–12ms. With 2% probability, a 60ms "server flush" pause occurs. This is faster than real LLM output intentionally — tests would time out otherwise — but preserves the statistical shape of real streaming: many small chunks, occasional larger ones.

`mulberry32` is a well-known 32-bit PRNG with good statistical properties and a tiny implementation. Using a seeded PRNG guarantees that test runs are deterministic: the same seed always produces the same chunk boundaries and timing pattern.

## Fixtures

Five JSON fixtures are imported:

- `simple-form` — minimal single-page form spec
- `nested-dashboard` — multi-level nested component tree
- `deep-children` — stress test for deep recursion in the parser
- `chat-widget-stream` — real-world chat UI spec
- `truncated-corpus` — a curated set of raw buffer strings that should never surface broken enum values

The `describe.each` suite runs four assertions against every fixture except `truncated-corpus` (which has its own dedicated suite).

## Four Core Invariants

### 1. Final emission matches full parse

After the simulation completes, `emissions[emissions.length - 1]` must `toMatchObject` the original fixture. This confirms that streaming does not lose or corrupt any data.

### 2. Node counts never decrease

`countNodes` walks the entire spec tree counting objects that have a `type` string field. Across the emission sequence, each count must be `>=` the previous. This prevents regressions where a partial parse causes already-rendered nodes to disappear mid-stream (which would produce visible UI flicker).

### 3. All widget types resolve to known widgets

`collectWidgetTypes` walks only UINode-shaped objects (those with `type` AND at least one of `children`, `props`, `bind`, `show`, `on_*`). This avoids false positives from config fields like `chart.props.type = "line"`. Every type seen in any intermediate emission is checked against `getWidget` — no "Unknown widget type" errors should ever appear during streaming.

### 4. Determinism across multiple seeds

The same fixture is run with seeds 1, 7, and 42. Each run must converge to the correct final spec. This guards against timing-sensitive state bugs that only manifest at particular chunk boundaries.

## Truncated Corpus Suite

`truncated-corpus.json` contains raw buffer strings representing edge cases collected from real and synthetic streaming sessions. For each case, `parsePartialSpec` is called and the result tree is walked: any enum-key value must also appear as a fully-closed quoted string in the raw buffer. This directly validates the `isStringClosed` contract.

## runSim Helper

```typescript
async function runSim(fixture: unknown, seed = 1): Promise<StreamSpec[]>
```

Passes `llmLikeStream` to `streamSpec` with `throttleMs: 20` and collects each `onUpdate` emission via a deep clone (`JSON.parse(JSON.stringify(spec))`). The deep clone is important — without it, all entries in the `emissions` array would point to the same mutable spec object and comparisons would always reflect the final state.

## Known Gaps

- The 15-second deadline in `runSim` is a hard timeout, not a Vitest timeout. A fixture that exceeds it causes `expect(store.done).toBe(true)` to fail rather than timing out cleanly.
- Seed selection (1, 7, 42) is arbitrary — a more systematic approach would use a property-based testing library.