---
title: Headless runtime
description: Run a spec with no renderer, in Node, a Worker or a test, and get back a plain tree of resolved nodes.
order: 6
---

`@ripple-ui/core` is the engine under `@ripple-ui/svelte` with no renderer attached. It takes the same specs, evaluates the same expressions and runs the same actions, but instead of drawing anything it gives you a resolved tree: plain objects with every expression evaluated, every `show` decided and every `each` expanded.

Nothing in the package imports Svelte or touches `document`, so it runs in Node, a Worker, a test file, or under another UI framework. A build check enforces that.

```bash
npm install @ripple-ui/core
```

If you already depend on `@ripple-ui/svelte`, core comes with it.

## What it's for

- **Testing a spec** without mounting a component: assert on the tree instead of on markup.
- **Checking model output** on the server: resolve the spec and inspect what it would show.
- **Rendering with another framework**: write a function from resolved nodes to your components.
- **Comparing two specs**: diff their trees.

## Quick start

```ts
import { createHeadlessRuntime } from '@ripple-ui/core';

const rt = createHeadlessRuntime({
  spec: {
    type: 'flex',
    children: [
      { type: 'text', id: 'label', props: { text: 'Count: {state.count}' } },
      {
        type: 'button',
        id: 'inc',
        props: { label: 'Add one' },
        on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
      }
    ]
  },
  state: { count: 0 }
});

rt.findById('label')?.props.text;          // 'Count: 0'
await rt.dispatch(rt.findById('inc')!, 'onclick');
rt.findById('label')?.props.text;          // 'Count: 1'
```

`spec` is a node (or a list of nodes), not the `{ version, state, ui }` wrapper. Pass `spec.ui` and `spec.state` from a full spec.

## The resolved tree

```ts
interface ResolvedNode {
  type: string;                                   // never 'if' or 'each'
  id?: string;
  props: Record<string, unknown>;
  class?: string;
  slot?: string;
  children: ResolvedNode[];
  bind?: { path: string; value: unknown; prop: string; event: string };
  events?: Record<string, EventHandlerOrArray>;
  source?: UINode;                                // the spec node it came from
}
```

Two things always hold, and tests check them:

1. **No expressions are left.** Every `{state.x}` in props, `class` and bind paths is evaluated.
2. **No control-flow nodes.** `if` and `each` are replaced by the children they selected or produced.

`bind` is ready to wire: `path` is the concrete state path (loop variables filled in), `value` is what's there now, and `prop` and `event` say which prop takes the value and which event writes it back.

`events` holds the raw action objects, not functions. Their expressions stay unevaluated so they read live state when they run.

## Runtime options and members

```ts
const rt = createHeadlessRuntime({
  spec,              // UINode | UINode[]
  state,             // initial state, copied
  data,              // host data, readable as data.* in expressions
  onEvent,           // your handler for host actions
  isKnownWidget,     // catalog test, for example hasWidget from @ripple-ui/svelte
  onUnknownWidget,   // return false to drop a node that fails isKnownWidget
  store              // a different StateStore
});
```

| Member | What it does |
|---|---|
| `rt.tree` | The current tree. Rebuilt on the next read after state or spec changes. |
| `rt.state` | The state store: `get`, `set`, `update`, `subscribe`. |
| `rt.dispatcher` | The `EventDispatcher` the Svelte renderer also uses. |
| `rt.dispatch(node, event, value?)` | Runs a node's handler for `event` (for example `onclick`). For the bind event, it writes the bound path first. |
| `rt.dispatchHandler(handler, value?)` | Runs an action object directly. |
| `rt.setSpec(spec)`, `rt.setData(data)` | Swaps the inputs, for a redraft or a stream. |
| `rt.subscribe(fn)` | Called with each new tree. |
| `rt.subscribeState(fn)` | Called with each state write. |
| `rt.walk()` | A depth-first generator over the tree. |
| `rt.findById(id)`, `rt.findByType(type)` | Queries the current tree. |

The tree is rebuilt lazily: a thousand writes with nobody reading cost one walk, not a thousand.

## Host actions

Actions that need your app go to `onEvent`, exactly as in the browser. It is the same dispatcher, so one handler serves both:

```ts
const rt = createHeadlessRuntime({
  spec,
  onEvent: async (event) => {
    if (event.type === 'api') {
      const res = await fetch(event.url!, { method: event.method ?? 'GET' });
      if (!res.ok) return { ok: false, error: { message: res.statusText, status: res.status } };
      return { ok: true, data: await res.json() };
    }
  }
});
```

One action behaves differently: `animate` needs a DOM node to play on. Headless still sends the event to `onEvent` and plays nothing.

## Just the resolver

`resolveTree` is a pure function: spec and state in, tree out. No store, no dispatcher, and it never changes its inputs.

```ts
import { resolveTree } from '@ripple-ui/core';

const { nodes } = resolveTree(spec, { state: { name: 'Ada' } });
```

## Testing a spec

```ts
import { createHeadlessRuntime } from '@ripple-ui/core';

it('shows the empty state until rows arrive', () => {
  const rt = createHeadlessRuntime({ spec: inboxSpec, state: { rows: [] } });
  expect(rt.findByType('empty-state')).toHaveLength(1);

  rt.state.set('rows', [{ id: 1 }, { id: 2 }]);
  expect(rt.findByType('empty-state')).toHaveLength(0);
});
```

These run in milliseconds without a DOM, and they test what the spec means rather than markup a restyle would break.

## A smaller runtime

`@ripple-ui/core/headless/slim` exports `createSlimHeadlessRuntime`, the same runtime with a smaller dispatcher for pages where size matters. It runs the state actions (`set`, `toggle`, `push`, `remove`, `open`) and passes `navigate`, `toast`, `emit`, `pin` and `unpin` to `onEvent`. Any other action logs a warning and is skipped. Pair it with a manifest that only teaches those actions; see `buildSlimManifest` in the [@ripple-ui/core reference](/docs/api/core).

## Writing a renderer for another framework

A renderer is a function from `ResolvedNode` to your framework's output:

```tsx
import { safeUrl } from '@ripple-ui/core';

function Node({ node, rt }) {
  const Widget = MY_WIDGETS[node.type] ?? Unknown;
  const props = { ...node.props, className: node.class };
  if (typeof props.href === 'string') props.href = safeUrl(props.href);

  if (node.bind) {
    props[node.bind.prop] = node.bind.value;
    props[node.bind.event] = (v) => rt.dispatch(node, node.bind.event, v);
  }
  for (const event of Object.keys(node.events ?? {})) {
    props[event] ??= (v) => rt.dispatch(node, event, v);
  }

  return <Widget {...props}>{node.children.map((c, i) => <Node key={c.id ?? i} node={c} rt={rt} />)}</Widget>;
}
```

Re-render when `rt.subscribe()` fires. You supply the widgets; the engine decides what to draw.

Resolved props are not URL-checked, and an expression can build a `javascript:` URL at resolve time. Pass any prop that ends up in an `href`, `src`, form `action` or `window.open` through `safeUrl`, as the Svelte renderer does.

## Inside a Svelte app

Pass the Svelte `StateManager` as the store to get the headless query and dispatch API with Svelte's fine-grained reactivity:

```ts
import { StateManager } from '@ripple-ui/svelte';
import { RippleHeadless } from '@ripple-ui/core/headless';

const store = new StateManager({ count: 0 });
const rt = new RippleHeadless({ spec, store });
```

## Known limit

`each` reads `items` from state or from `data`, never from an outer loop variable, so a nested `each` over `{group.members}` resolves to nothing. The Svelte renderer behaves the same way.
