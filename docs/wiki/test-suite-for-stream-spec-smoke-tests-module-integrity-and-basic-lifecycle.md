---
{
  "title": "Test Suite for Stream Spec Smoke Tests — Module Integrity and Basic Lifecycle",
  "summary": "The smoke tests are the first gate in the streaming test pipeline: they verify that the module is importable, exported types exist, the widget registry is intact, and the `streamSpec` store handles trivial lifecycle events correctly. These tests run fast and should catch packaging regressions before the heavier simulation and unit suites execute.",
  "concepts": [
    "smoke test",
    "streamSpec",
    "StreamParseError",
    "StreamSpecStore",
    "StreamSpecOptions",
    "widget registry",
    "skeleton widget",
    "cancel idempotency",
    "hasWidget",
    "getWidget",
    "module import check",
    "packaging regression"
  ],
  "categories": [
    "streaming",
    "testing",
    "test"
  ],
  "source_docs": [
    "6b22afaac91a10c0"
  ],
  "backlinks": null,
  "word_count": 416,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/stream-spec.smoke.test.ts` is a minimal, fast test file that answers three questions:

1. Does the streaming module export what it's supposed to?
2. Is the widget registry in a healthy state?
3. Does `streamSpec` handle edge-case lifecycle inputs without crashing?

The file is deliberately small. Its job is not to test streaming behavior in depth — the simulation and unit test files do that — but to be a fast canary that catches packaging and import regressions early in the test run.

## Suite 1: Module Imports

Verifies that `streamSpec` is a function (not `undefined`, which would happen if the barrel export broke), that `StreamParseError` is a constructible class with the expected `kind` and `lastValid` properties, and that `StreamSpecOptions` / `StreamSpecStore` surface as usable TypeScript shapes at runtime.

The `StreamSpecStore` check is marked "no-op" — since it's a TypeScript interface (not a class), the test only verifies that `{ done: false }` satisfies a `Partial<StreamSpecStore>` without crashing TypeScript compilation.

## Suite 2: Widget Registry

```typescript
it('skeleton is registered', () => {
  expect(hasWidget('skeleton')).toBe(true);
});

it('core widgets still resolve (no accidental unregistering)', () => {
  for (const type of ['flex', 'card', 'text', 'button', 'input', 'dashboard']) {
    expect(hasWidget(type)).toBe(true);
  }
});
```

The `'skeleton'` widget is the placeholder shown while streaming is in progress. If it is ever accidentally removed from the registry, every streaming render would display an "Unknown widget" error instead of a loading skeleton — a severe regression. The suite tests it explicitly.

The core widget check guards against tree-shaking or bundler misconfiguration that might accidentally drop widget registrations when the streaming module is imported in isolation.

## Suite 3: streamSpec Basic Lifecycle

**Immediate cancel** — an empty `AsyncGenerator` is passed to `streamSpec` and `cancel()` is called synchronously. The store must be `done: true` with no error.

**Cancel idempotency** — `cancel()` is called three times. The second and third calls must be no-ops. This prevents event-listener leaks or double-signal dispatch in hosts that call cancel aggressively (e.g., on component teardown during navigation).

These tests use a locally-defined `empty()` generator rather than importing a helper, keeping the suite self-contained and readable without any shared state.

## Known Gaps

- The smoke suite imports from `./index.js` (the barrel) but the unit and simulation tests import directly from `./stream-spec.svelte.js`. This split was intentional for isolation but means a bug in the barrel re-exports (name collision, missing type, etc.) would only be caught here.
- No smoke test for the `AbortSignal` path — that is covered in the unit suite.