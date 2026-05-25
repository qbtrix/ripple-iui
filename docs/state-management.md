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

### Per-widget bind contract

> [!NOTE]
> **Status (2026-05-25):** shipped — the per-widget bind contract landed in PR ripple#36. This doc was lagging; updated to match runtime.

Different widgets expose their bound value through different prop +
event pairs. Inputs use the default `value` + `onchange`. Checkboxes
and switches use `checked` + `onchange`. Wizards bind on `currentStep`
+ `onstepchange`. Popovers bind on `open` + `onopenchange`. Without a
formal contract the renderer would have to assume every widget exposes
`value` + `onchange` and silently fail on the rest.

`src/lib/core/widget-bind-contract.ts` is the **runtime source of
truth** for which prop receives the bound value and which event fires
when the widget mutates it. `NodeRenderer` looks each widget up there
before wiring two-way binding.

```ts
export interface WidgetBindContract {
  /** Component prop that receives the resolved `bind` value. */
  prop: string;
  /** Component event prop that fires when the widget mutates the value. */
  event: string;
}

export const DEFAULT_BIND_CONTRACT: WidgetBindContract = {
  prop: 'value',
  event: 'onchange',
};
```

Registered non-default contracts as of PR #36 include:

| Widget type(s) | `prop` | `event` |
|----------------|--------|---------|
| `checkbox`, `switch` | `checked` | `onchange` |
| `wizard`, `wizard-layout` | `currentStep` | `onstepchange` |
| `popover` | `open` | `onopenchange` |
| `order-status`, `shipment-tracker`, `order-tracking` | `currentStep` | `onstepchange` |

Every other widget uses `DEFAULT_BIND_CONTRACT`. A second list
(`DEFAULT_BIND_WIDGETS`) explicitly tracks the widgets that opt into
the default — used by the dev-time warning below so a newly-added
widget without a registered contract surfaces a console warning instead
of silently no-op-ing in specs.

#### Registering a new bind contract

When adding a widget whose bindable surface isn't `value` + `onchange`,
register it in `WIDGET_BIND_CONTRACTS`:

```ts
// src/lib/core/widget-bind-contract.ts
const WIDGET_BIND_CONTRACTS: Readonly<Record<string, WidgetBindContract>> = {
  // existing entries...
  'my-stepper': { prop: 'activeStep', event: 'onstepchange' },
};
```

If your widget uses the plain default, add its type to
`DEFAULT_BIND_WIDGETS` instead. That silences the dev warning while
still keeping every bindable widget classified somewhere.

#### How the runtime enforces it

`NodeRenderer` calls `getBindContract(node.type)` for any node that
declares `bind`, then writes the bound value into `[contract.prop]` and
hooks the contract's `[contract.event]` to push state back. In dev
builds it also calls `warnUnregisteredBindContract(node.type)` — that
function fires a one-time `console.warn` per unknown widget type so
the gap is visible without spamming the console.

The contract is exercised in `src/lib/components/NodeRenderer.bind.test.ts`:
`input` writes back through `value`, `checkbox` writes back through
`checked`, `wizard-layout` advances through `currentStep`, and
`order-status` is regression-guarded against falling back to the
default contract.

#### Migration note

Widgets registered before PR #36 may still rely on the legacy
hardcoded `value` + `onchange` assumption — they continue to work
because that's exactly what `DEFAULT_BIND_CONTRACT` provides. The
contract is enforced for new widgets going forward: any non-default
bindable widget added after PR #36 must declare its contract, and the
dev warning will fire until it does.

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
