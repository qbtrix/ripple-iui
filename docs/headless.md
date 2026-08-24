<!-- docs/headless.md — the renderer-free runtime. Created 2026-08-25 alongside src/lib/headless/. -->

# Headless Ripple

`@ripple-ui/svelte/headless` is Ripple's spec engine with no renderer
attached. Same specs, same expressions, same event actions — but instead
of DOM it hands you a **resolved tree**: plain objects with every
expression evaluated, every `show` decided, and every `each` expanded.

Nothing reachable from this entry point imports Svelte or touches
`document`, so it runs in bare Node, a Worker, a test file, or a
non-Svelte framework.

```bash
npm install @ripple-ui/svelte      # same package
```

```ts
import { createHeadlessRuntime } from '@ripple-ui/svelte/headless';
```

## Why it exists

The engine was already framework-free. `StateManager`, `EventDispatcher`,
and the expression resolver are plain TypeScript classes; only the tree
**walk** lived inside a Svelte component. Headless lifts that walk out, so
one engine serves several consumers:

| You want to | Before | Now |
|---|---|---|
| Test that a spec produces the right UI | mount jsdom, query the DOM | assert on the resolved tree |
| Render a spec on a server / Worker | not possible without SSR | resolve and serialize |
| Render Ripple specs in React, Vue, or native | port the engine | write a renderer over `ResolvedNode` |
| Validate an agent's generated spec | eyeball it | resolve and inspect |
| Diff two specs' actual output | screenshot compare | diff two trees |

The Svelte package is unchanged. It is now one renderer over a shared
engine rather than the only way in.

## Quick start

```ts
import { createHeadlessRuntime } from '@ripple-ui/svelte/headless';

const spec = {
  type: 'container',
  children: [
    { type: 'text', id: 'label', props: { content: 'Count: {state.count}' } },
    {
      type: 'button',
      id: 'inc',
      props: { label: 'Add one' },
      on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
    }
  ]
};

const rt = createHeadlessRuntime({ spec, state: { count: 0 } });

rt.findById('label').props.content;   // 'Count: 0'

await rt.dispatch(rt.findById('inc'), 'onclick');

rt.findById('label').props.content;   // 'Count: 1'
```

## The resolved tree

`ResolvedNode` is what a renderer consumes. Two invariants hold, and are
enforced by tests:

1. **No unevaluated expressions.** Every `{state.x}` in props, `class`,
   and bind paths is already resolved.
2. **No control-flow nodes.** `if` and `each` never appear in the output —
   they collapsed into the children they selected or produced.

```ts
interface ResolvedNode {
  type: string;                  // never 'if' or 'each'
  id?: string;
  props: Record<string, unknown>;
  class?: string;
  slot?: string;
  children: ResolvedNode[];
  bind?: { path: string; value: unknown; prop: string; event: string };
  events?: Record<string, EventHandlerOrArray>;
  source?: UINode;               // the spec node this came from
}
```

`bind` is pre-chewed for renderers: `path` is the concrete state path
(loop placeholders substituted), `value` is what's there now, and
`prop`/`event` come from the widget's bind contract — feed `value` into
`prop`, and call back on `event`.

`events` holds **raw handler specs**, not bound functions. Expressions
inside them are deliberately left alone so they resolve against live
state at dispatch time, not resolution time.

## Runtime API

```ts
const rt = createHeadlessRuntime({
  spec,                    // UINode | UINode[]
  state,                   // initial state (cloned)
  data,                    // host data bag, readable as `data.*`
  onEvent,                 // host-delegated actions
  isKnownWidget,           // catalog membership test
  onUnknownWidget,         // return false to drop unknown nodes
  store                    // supply a different StateStore
});
```

| Member | Does |
|---|---|
| `rt.tree` | current `ResolvedTree`; memoized, recomputed after state or spec changes |
| `rt.state` | the `StateStore` — `get` / `set` / `update` / `subscribe` |
| `rt.dispatcher` | the same `EventDispatcher` the Svelte runtime uses |
| `rt.dispatch(node, event, value?)` | run a node's handler; writes the bound path first when `event` is the bind event |
| `rt.dispatchHandler(spec, value?)` | run a handler spec directly |
| `rt.setSpec(spec)` / `rt.setData(data)` | swap inputs (agent redraft, streaming) |
| `rt.subscribe(fn)` | observe resolved trees |
| `rt.subscribeState(fn)` | observe path-level state writes |
| `rt.walk()` | depth-first generator over the tree |
| `rt.findById(id)` / `rt.findByType(type)` | query the current tree |

### Reactivity is pull-based

The Svelte runtime re-renders through `$derived`. Headless recomputes the
tree lazily on the next `tree` read after a state change, and notifies
`subscribe()` observers so a host can drive its own render loop. A batch
of 1000 writes with nobody watching costs one tree walk, not 1000.

### Host-delegated actions

`api`, `navigate`, `emit`, `toast`, `open`, `run_source`, `call_binding`,
`invoke_tool` and friends go to your `onEvent` callback exactly as they do
in the browser — it is the same dispatcher, so one host implementation
serves both runtimes.

```ts
const rt = createHeadlessRuntime({
  spec,
  onEvent: async (event) => {
    if (event.type === 'api') {
      const res = await fetch(event.url, { method: event.method });
      return { data: await res.json() };     // feeds on_success chaining
    }
  }
});
```

**One action differs.** `animate` needs a live DOM node to pulse. Headless
supplies no animation root, so it degrades to emit-only: the event still
reaches `onEvent`, no built-in animation runs. That is the complete list
of behavioural differences between the two runtimes.

## Just the resolver

If you want no runtime at all, `resolveTree` is a pure function:

```ts
import { resolveTree } from '@ripple-ui/svelte/headless';

const { nodes } = resolveTree(spec, { state: { name: 'Ada' } });
```

No state manager, no dispatcher, no memo — spec and state in, tree out.
It never mutates its inputs.

## Testing specs without a DOM

The most immediate payoff. Instead of mounting a component and querying
rendered HTML:

```ts
import { createHeadlessRuntime } from '@ripple-ui/svelte/headless';

it('shows the empty state until rows arrive', async () => {
  const rt = createHeadlessRuntime({ spec: inboxSpec, state: { rows: [] } });
  expect(rt.findByType('empty-state')).toHaveLength(1);

  rt.state.set('rows', [{ id: 1 }, { id: 2 }]);
  expect(rt.findByType('empty-state')).toHaveLength(0);
  expect(rt.findByType('row')).toHaveLength(2);
});
```

These run in milliseconds with no jsdom, and they assert on what the spec
*means* rather than on markup that a widget restyle would break.

## Writing a renderer for another framework

A renderer is a function from `ResolvedNode` to your framework's output.
Everything you need is on the node:

```tsx
function Node({ node, rt }) {
  const Widget = MY_WIDGETS[node.type] ?? Unknown;
  const props = { ...node.props, className: node.class };

  if (node.bind) {
    props[node.bind.prop] = node.bind.value;
    props[node.bind.event] = (v) => rt.dispatch(node, node.bind.event, v);
  }
  for (const event of Object.keys(node.events ?? {})) {
    props[event] ??= (v) => rt.dispatch(node, event, v);
  }

  return <Widget {...props}>{node.children.map((c) => <Node key={c.id} node={c} rt={rt} />)}</Widget>;
}
```

Subscribe to `rt.subscribe()` and re-render on notification. You supply
the widgets; the engine supplies everything about what to draw.

## Using it inside a Svelte app

Pass the rune-based store to get the headless query and dispatch API with
fine-grained Svelte reactivity:

```ts
import { StateManager } from '@ripple-ui/svelte';
import { RippleHeadless } from '@ripple-ui/svelte/headless';

const store = new StateManager({ count: 0 });
const rt = new RippleHeadless({ spec, store });
```

## Guarantees, and how they're kept

- **Parity of state** — `state-parity.test.ts` runs one operation script
  against both `HeadlessStateManager` and the rune-based `StateManager`
  and asserts identical snapshots and identical notification traces at
  every step. Neither can drift silently.
- **Purity** — `purity.test.ts` crawls the transitive import graph from
  `headless/index.ts` and fails on any Svelte import, any `.svelte.ts`
  module, or any top-level `document` / `window` access. "Headless" is a
  build gate, not a promise in a README.
- **Resolution invariants** — `resolve-tree.test.ts` sweeps whole trees
  for leftover templates and control-flow nodes.

## Known limit, shared with the Svelte renderer

`each` reads its `items` from the data bag or from state, **never from
loop context**. A nested `each` over an outer item's array
(`items: '{group.members}'`) resolves to nothing — in both runtimes.
This is pinned by a test so the two stay in step; fixing it is a
spec-engine change that must land in `NodeRenderer.svelte` and
`resolve-tree.ts` together.
