---
{
  "title": "Test Suite: WidgetRegistry — Register, Invoke, and Unregister Round Trips",
  "summary": "Unit tests for the WidgetRegistry class, verifying method registration, argument forwarding, idempotent unregistration, replacement safety, and edge case handling. These tests were written alongside Phase B flow actions to ensure the `invoke` action has a well-behaved backing registry.",
  "concepts": [
    "WidgetRegistry",
    "register",
    "invoke",
    "unregister",
    "idempotent",
    "HMR",
    "replacement safety",
    "Svelte effect cleanup",
    "invoke action",
    "Phase B"
  ],
  "categories": [
    "testing",
    "widget-system",
    "registry",
    "test"
  ],
  "source_docs": [
    "870fb5843f1cadc7"
  ],
  "backlinks": null,
  "word_count": 505,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite specifies the contract for `WidgetRegistry` — the in-process registry that allows declarative `invoke` actions to call methods on mounted Svelte widget instances. The tests were created as part of Phase B (flow-actions feature) because the `invoke` action requires a registry with precise semantics around registration lifecycle, argument passing, and cleanup.

## Test Cases

### Basic Registration and Invocation

```typescript
it('registers and invokes a method by id', () => {
  const r = new WidgetRegistry();
  const fn = vi.fn(() => 'hi');
  r.register('card1', 'ping', fn);
  const out = r.invoke('card1', 'ping');
  expect(fn).toHaveBeenCalledTimes(1);
  expect(out).toBe('hi');
});
```

Verifies the happy path: `register` followed by `invoke` calls the function exactly once and returns its value.

### Argument Forwarding

`invoke` spreads the `args` array into the registered function:

```typescript
r.register('calc', 'add', fn as never);
const out = r.invoke('calc', 'add', [2, 3]);
expect(fn).toHaveBeenCalledWith(2, 3);
expect(out).toBe(5);
```

The `as never` cast works around TypeScript's strict function type checking for the variadic argument signature.

### Selective Unregister

The test confirms that calling the unregister function returned by `register('modal', 'open', open)` removes only the `open` method, not `close`:

```typescript
offOpen();
expect(r.has('modal', 'open')).toBe(false);
expect(r.has('modal', 'close')).toBe(true);
```

This prevents accidental teardown of sibling methods during component unmount.

### Idempotent Unregister

```typescript
off();
expect(() => off()).not.toThrow();  // second call is a no-op
```

This matters because `$effect` cleanup functions in Svelte 5 may be called multiple times during development (HMR, strict mode double-invoking). An unregister that throws on second call would break widget remounts.

### Replacement Safety

The most nuanced test: if a widget re-registers under the same `id + method` (during HMR or remount), the old `off` function must not remove the new registration:

```typescript
const offFirst = r.register('m', 'x', first);
r.register('m', 'x', second);  // replace
offFirst();  // old cleanup
expect(r.has('m', 'x')).toBe(true);
r.invoke('m', 'x');
expect(second).toHaveBeenCalledTimes(1);
expect(first).not.toHaveBeenCalled();
```

The registry achieves this by capturing `ownFn` in the closure and only deleting if the current registered function is still the same instance.

### Unknown Target — No Throw

```typescript
expect(r.invoke('ghost', 'poof')).toBeUndefined();
```

The `invoke` action in `EventDispatcher` warns but continues the flow when a target is unknown. This test ensures the registry itself never throws for missing targets.

### has() and clear()

Two utility tests verify that `has()` accurately reflects registration state, and `clear()` drops all registrations — useful for test teardown and fresh instantiation.

### Empty ID Guard

```typescript
const off = r.register('', 'x', () => {});
expect(r.has('', 'x')).toBe(false);
expect(() => off()).not.toThrow();
```

Widgets without an `id` prop must not pollute the registry. The guard returns a no-op unregister function, ensuring widgets that opt out of `invoke` support remain entirely invisible to the registry.

### Factory Function

```typescript
const r = createWidgetRegistry();
r.register('z', 'm', () => 42);
expect(r.invoke('z', 'm')).toBe(42);
```

Confirms `createWidgetRegistry()` produces a fully functional instance.

## Known Gaps

No TODO or FIXME markers. The test suite does not cover concurrent registration from multiple widget instances (two components racing to register the same id+method), which could occur in list rendering where `{#each}` produces multiple instances with the same id from a duplicated spec.
