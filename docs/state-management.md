# State Management

Ripple uses a `StateManager` class built on Svelte 5's `$state` rune for reactive state management.

## Overview

State is initialized from the spec and optional overrides:

```svelte
<Ripple
  spec={mySpec}
  state={{ user: 'override' }}
/>
```

The merge order is: `spec.state` → `state` prop (overrides win).

## StateManager API

### Creating

```typescript
import { StateManager, createStateManager } from '@ripple-ui/svelte';

const manager = new StateManager({ count: 0, user: { name: 'Alice' } });
// or
const manager = createStateManager({ count: 0 });
```

### Reading

```typescript
manager.state;              // Full state object (reactive proxy)
manager.get('count');       // 0
manager.get('user.name');   // 'Alice'
manager.get('nonexistent'); // undefined
manager.has('count');       // true
```

### Writing

```typescript
manager.set('count', 1);                    // Simple set
manager.set('deeply.nested.value', 42);     // Auto-creates intermediate objects
manager.update('count', (n) => n + 1);      // Functional update
manager.delete('user.name');                // Remove a value
manager.reset({ fresh: 'state' });          // Replace entire state
```

## Dot-Notation Paths

All state operations use dot-separated paths:

```
"user.profile.name"  →  state.user.profile.name
"items.0.selected"   →  state.items[0].selected
"count"              →  state.count
```

When setting a nested path, intermediate objects are created automatically:
```typescript
manager.set('a.b.c', 'hello');
// state = { a: { b: { c: 'hello' } } }
```

## State in Specs

Define initial state in the spec:

```json
{
  "version": "1.0",
  "state": {
    "count": 0,
    "selectedTab": "overview",
    "filters": {
      "search": "",
      "category": "all"
    }
  },
  "ui": { ... }
}
```

## State Binding

Use `bind` on nodes for two-way binding:

```json
{
  "type": "input",
  "bind": "{state.searchQuery}",
  "on_change": { "action": "set", "target": "searchQuery" }
}
```

For `checkbox` and `switch`, the bound value is passed as `checked` instead of `value`.

## State in Events

The `set` action modifies state:

```json
{
  "on_click": { "action": "set", "target": "count", "value": 0 }
}
```

Without a `value`, the event value (from the widget) is used:

```json
{
  "on_change": { "action": "set", "target": "selectedOption" }
}
```

Expression values are resolved at invocation time:

```json
{
  "on_click": { "action": "set", "target": "selected", "value": "{item.id}" }
}
```

## Reactivity

`StateManager.state` is a Svelte 5 `$state` proxy. Property access inside `$derived` or `$effect` blocks is automatically tracked:

```svelte
<script>
  const manager = getContext('ui-state');
  const count = $derived(manager.state.count);
</script>
```

The `NodeRenderer` uses `$derived.by()` for all computed values, ensuring props, visibility, and bindings update when their dependencies change.
