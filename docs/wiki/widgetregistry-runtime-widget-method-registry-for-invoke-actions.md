---
{
  "title": "WidgetRegistry — Runtime Widget Method Registry for Invoke Actions",
  "summary": "WidgetRegistry is a per-Ripple-instance registry that allows widget components to expose named methods so declarative `invoke` flow actions can call them programmatically. It uses a nested `Map\u003cstring, Map\u003cstring, WidgetMethod\u003e\u003e` structure keyed by widget ID and method name, with safe unregister semantics designed for Svelte 5 `$effect` cleanup.",
  "concepts": [
    "WidgetRegistry",
    "invoke action",
    "WidgetMethod",
    "Svelte context",
    "effect cleanup",
    "HMR safety",
    "idempotent unregister",
    "instance-scoped",
    "widget method registration",
    "createWidgetRegistry"
  ],
  "categories": [
    "core",
    "widget-system",
    "registry"
  ],
  "source_docs": [
    "f6c8802b74bb9ef5"
  ],
  "backlinks": null,
  "word_count": 585,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `invoke` action in Ripple's event system needs a way to call imperative methods on already-mounted widget components — for example, opening a modal, scrolling a list to the top, or triggering an animation. `WidgetRegistry` provides that mechanism without requiring any shared global state or component prop threading.

## Design — No Globals

The registry is instance-scoped (one per Ripple component tree) and passed via Svelte context:

```typescript
// In a widget component
const registry = getContext<WidgetRegistry>('ui-widget-registry');
$effect(() => {
  if (!id || !registry) return;
  const off = registry.register(id, 'open', () => setOpen(true));
  return off; // cleanup on unmount
});
```

This means id collisions across unrelated Ripple renders on the same page are impossible — each render has its own registry instance. The context-based injection also makes the registry easy to mock in tests.

## Data Structure

```typescript
private methods = new Map<string, Map<string, WidgetMethod>>();
```

The outer map is keyed by widget `id`. The inner map is keyed by method name. This two-level structure allows `unregister` to remove a specific method without touching sibling methods on the same widget, and allows `clear()` to drop everything in a single call.

## register — Replacement and Idempotent Cleanup

```typescript
register(id: string, method: string, fn: WidgetMethod): () => void {
  if (!id || !method) return () => {};
  // ...
  bucket.set(method, fn);
  const ownFn = fn;
  return () => {
    const current = this.methods.get(id);
    if (current && current.get(method) === ownFn) {
      current.delete(method);
      if (current.size === 0) this.methods.delete(id);
    }
  };
}
```

The `ownFn` capture is the key safety mechanism. If a widget remounts (HMR, list reorder), it calls `register` again with a new function before the old `$effect` cleanup fires. When cleanup runs, it checks `current.get(method) === ownFn` — if the bucket now holds a newer function, the cleanup is a no-op. Without this, a component's `onDestroy` or `$effect` teardown would silently remove a freshly-registered replacement.

Empty `id` or `method` returns an empty function immediately — this prevents polluting the registry with entries from widgets that don't have an explicit `id` prop.

Bucket cleanup: when the last method for an `id` is removed, the outer map entry is deleted. This prevents memory leaks in long-running dashboards where many widgets mount and unmount.

## invoke — Silent on Missing Target

```typescript
invoke(id: string, method: string, args: unknown[] = []): unknown {
  const bucket = this.methods.get(id);
  if (!bucket) return undefined;
  const fn = bucket.get(method);
  if (!fn) return undefined;
  return fn(...args);
}
```

`invoke` returns `undefined` rather than throwing when the target or method is not found. This is intentional — the `EventDispatcher` logs a warning and continues the flow. Throwing here would cause a runtime error that aborts the entire user interaction, which is inappropriate for a declarative spec that may have been valid when authored but references a widget that isn't currently mounted.

## WidgetMethod Type

```typescript
export type WidgetMethod = (...args: unknown[]) => unknown | Promise<unknown>;
```

Methods may be synchronous or async. The `EventDispatcher`'s `handleInvoke` duck-type checks the return value for a `.then` property and awaits it if present, ensuring async methods complete before the next flow step.

## Known Gaps

- There is no mechanism for a method to signal failure back to the dispatcher. An `invoke` target that throws internally will propagate the error up through `EventDispatcher.handleInvoke`, which does not have a try/catch, potentially aborting the current flow with an unhandled exception.
- The registry does not support wildcard subscriptions or method discovery (listing all methods for a given widget id).
