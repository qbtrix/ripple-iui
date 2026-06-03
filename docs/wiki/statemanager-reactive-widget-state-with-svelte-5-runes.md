---
{
  "title": "StateManager — Reactive Widget State with Svelte 5 Runes",
  "summary": "StateManager is the reactive state container for a Ripple widget instance. It wraps a Svelte 5 `$state` object and exposes dot-notation path-based get, set, update, delete, and reset operations. Every mutation triggers Svelte's fine-grained reactivity, causing only the affected widget subtrees to re-render.",
  "concepts": [
    "StateManager",
    "Svelte 5",
    "$state rune",
    "dot notation",
    "reactive state",
    "structuredClone",
    "freshContext",
    "createStateManager",
    "path-based API",
    "immutable updates"
  ],
  "categories": [
    "core",
    "state-management",
    "reactivity"
  ],
  "source_docs": [
    "949d78bb59db6cd1"
  ],
  "backlinks": null,
  "word_count": 542,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`StateManager` is the single source of truth for mutable runtime state within a Ripple renderer instance. Widget props, form inputs, modal visibility flags, API response data — all of it flows through this class. By centralizing state in a single reactive object, every `EventDispatcher` action that calls `stateManager.set()` automatically propagates to any template binding that reads that path.

## Svelte 5 Runes Integration

```typescript
private _state = $state<Record<string, unknown>>({});
```

The `$state` rune makes `_state` deeply reactive. Svelte 5's proxy-based reactivity tracks individual property accesses, so setting `state.user.name` only invalidates bindings that read `user.name` — not the entire state object. This is critical for performance in large widget trees.

## Constructor — Defensive Cloning

```typescript
constructor(initialState: Record<string, unknown> = {}) {
  try {
    this._state = structuredClone(initialState);
  } catch {
    this._state = JSON.parse(JSON.stringify(initialState));
  }
}
```

`structuredClone` is the preferred path because it handles circular references and typed arrays. The `JSON.parse(JSON.stringify(...))` fallback handles environments where `structuredClone` is unavailable (older runtimes) or when the initial state contains non-serializable values like `Date` objects — though notably both methods will drop functions. The clone prevents callers from mutating the state manager's internal state via the reference they passed in.

## Path-Based API

All operations use dot-notation paths rather than direct property access:

```typescript
manager.get('user.profile.name'); // 'Alice'
manager.set('user.profile.name', 'Bob'); // creates user.profile if missing
manager.update('count', (n) => (n as number) + 1);
manager.has('token'); // false if undefined
manager.delete('session.token');
```

### set — Creates Intermediate Nodes

The `set` method creates intermediate objects when the path doesn't exist yet:

```typescript
if (current[part] === undefined || current[part] === null) {
  current[part] = {};
}
```

This allows `set('deeply.nested.value', 42)` to work on a fresh state manager without pre-populating the path. The non-traversable check (`typeof current[part] !== 'object'`) logs a warning and returns early rather than throwing — protecting against accidental overwrites of scalar values.

## state Getter — Reactive Snapshot

```typescript
get state(): Record<string, unknown> {
  return this._state;
}
```

The getter returns the live `$state` proxy. This is intentional — `EventDispatcher`'s `freshContext()` calls `this.stateManager.state` to get an up-to-date snapshot after each step mutates state. If `state` returned a clone, the expression resolver would see stale values mid-flow.

## reset — Full State Replacement

```typescript
reset(newState: Record<string, unknown> = {}): void {
  for (const key of Object.keys(this._state)) {
    delete this._state[key];
  }
  Object.assign(this._state, structuredClone(newState));
}
```

Rather than assigning `this._state = structuredClone(newState)` (which would replace the `$state` proxy with a plain object), `reset` mutates the existing proxy in place. This preserves Svelte's reactivity tracking — any component that already holds a reference to `manager.state` will see the update without needing to re-subscribe.

## createStateManager Factory

```typescript
export function createStateManager(initialState: Record<string, unknown> = {}): StateManager {
  return new StateManager(initialState);
}
```

A simple convenience function for functional-style usage. The `EventDispatcher` and renderer components call this factory rather than `new StateManager()` directly.

## Known Gaps

- `get` and `set` do not support array index notation (`items.0.name`). Array elements can only be accessed if the key is an integer string in a numeric property (e.g., `items.0` works as a string key but is not validated as an array index).
- There is no `batch` method for performing multiple mutations as a single reactive update. Rapid sequential `set` calls may trigger intermediate re-renders.
