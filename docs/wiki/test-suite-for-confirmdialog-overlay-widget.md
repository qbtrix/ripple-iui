---
{
  "title": "Test Suite for ConfirmDialog Overlay Widget",
  "summary": "Vitest + Testing Library test suite for `ConfirmDialog`, covering state-driven mount/unmount, confirm and cancel button resolution, and the fallback path where `resolveConfirm` returns false (stale resolver after HMR). The `seed()` helper wires a real `StateManager`, `EventDispatcher`, and `WidgetRegistry` through Svelte context.",
  "concepts": [
    "ConfirmDialog",
    "testing-library",
    "vitest",
    "seed helper",
    "StateManager",
    "EventDispatcher",
    "WidgetRegistry",
    "CONFIRM_STATE_KEY",
    "resolveConfirm",
    "stale resolver",
    "HMR fallback",
    "context injection",
    "integration test"
  ],
  "categories": [
    "testing",
    "overlay",
    "flow-actions",
    "test"
  ],
  "source_docs": [
    "777188bc2d03d4ce"
  ],
  "backlinks": null,
  "word_count": 469,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test file exercises `lib/widgets/overlay/ConfirmDialog.svelte` using `@testing-library/svelte` and `@testing-library/user-event`. It is notable for using real (non-mocked) instances of `StateManager`, `EventDispatcher`, and `WidgetRegistry`, making it an integration test for the state-to-dialog wiring rather than a pure unit test.

## The `seed()` Helper

```typescript
function seed(initialPending?: PendingConfirm) {
  const state = createStateManager(
    initialPending ? { [CONFIRM_STATE_KEY]: initialPending } : {}
  );
  const dispatcher = new EventDispatcher(state, undefined, new WidgetRegistry());
  const context = new Map<string, unknown>([
    ['ui-state', state],
    ['ui-events', dispatcher]
  ]);
  return { state, dispatcher, context };
}
```

The `seed()` function creates a fully wired context pair — the same shape that the real Ripple runtime provides. Tests that need a pre-populated confirm state pass an `initialPending` object; tests that want an empty state pass nothing. This avoids repetitive setup and ensures all tests use the same context injection pattern that `ConfirmDialog` expects.

The returned `{ state, dispatcher, context }` triple is destructured selectively per test: `context` is always needed for render; `state` is needed for post-action assertions; `dispatcher` is needed for spy setup.

## What Is Tested

### No-Render When Empty

```typescript
it('does not render when no pending confirm is present', () => {
  const { context } = seed();
  render(ConfirmDialog, { context });
  expect(screen.queryByRole('dialog')).toBeNull();
});
```

Confirms the state-gated render: an empty state produces no dialog DOM.

### State-Populated Render

A `PendingConfirm` pre-loaded into state causes the dialog, title, message, and both button labels to appear. Uses `findByText` (async) to handle any reactive rendering delay.

### Confirm Resolution and State Clearing

```typescript
const afterState = state.get(CONFIRM_STATE_KEY);
expect(afterState === null || afterState === undefined).toBe(true);
```

After clicking OK, the test verifies that `resolveConfirm` was called with the correct `pending_id` and decision, AND that the state key is cleared. The assertion accepts both `null` and `undefined` because the component may clear the key in two ways: via dispatcher (which may set it to `undefined`) or via direct `stateManager.set` (which sets it to `null`).

### Stale Resolver Fallback

```typescript
const resolve = vi.spyOn(dispatcher, 'resolveConfirm').mockReturnValue(false);
```

This test mocks `resolveConfirm` to return `false`, simulating the HMR scenario where the dispatcher no longer has the pending ID. After clicking Yes, the state key must still be cleared — verifying the fallback path that prevents UI lockup.

### Cancel Path

Verifies that clicking the cancel button calls `resolveConfirm` with `'cancel'`, matching the contract the flow engine expects.

## Known Gaps

- The overlay/Esc dismissal path (`handleOpenChange(false)`) is not explicitly tested — there is no test for backdrop click or keyboard Escape triggering a cancel resolution.
- No test covers the behavior when `stateManager` or `eventDispatcher` context is missing (the silent no-render path).
- The test for state clearing after Confirm has a comment acknowledging uncertainty about which branch runs (`resolveConfirm` vs. direct `set`), suggesting the implementation's clearing mechanism may not be fully deterministic.