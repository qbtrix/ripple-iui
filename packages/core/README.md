<!-- packages/core/README.md — @ripple-ui/core. Created 2026-08-25 (monorepo split). -->

# @ripple-ui/core

Ripple's spec engine, with no renderer attached.

An LLM produces a declarative JSON spec; this package turns it into a
resolved tree of plain objects — expressions evaluated, conditions
decided, loops expanded. What you draw that tree with is your business.

```bash
npm install @ripple-ui/core
```

```ts
import { createHeadlessRuntime } from '@ripple-ui/core';

const rt = createHeadlessRuntime({
  spec: {
    type: 'container',
    children: [
      { type: 'text', id: 'label', props: { content: 'Count: {state.count}' } },
      {
        type: 'button',
        id: 'inc',
        on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
      }
    ]
  },
  state: { count: 0 }
});

rt.findById('label').props.content;              // 'Count: 0'
await rt.dispatch(rt.findById('inc'), 'onclick');
rt.findById('label').props.content;              // 'Count: 1'
```

## What's in here

- **Schema** — the `UISpec` / `UniversalSpec` zod schemas, event handlers,
  motion, and brand tokens.
- **Expressions** — `{state.foo}`, `{item.price}`, ternaries, comparisons,
  arithmetic, and template strings.
- **State** — `StateStore`, the interface every Ripple runtime implements,
  and `HeadlessStateManager`, the dependency-free implementation.
- **Events** — the dispatcher: 21 action verbs, multi-step flows, async
  chaining, host delegation.
- **Motion** — the animation compiler and presets (compilation only; playing
  an animation needs a DOM, so that lives in a renderer).
- **Headless runtime** — spec + state in, `ResolvedNode` tree out.

No widgets. A resolved tree names widget *types*; how a `table` draws is a
renderer's job.

## Framework-agnostic, enforced

Nothing reachable from this package imports Svelte, React, or any other
framework, and nothing touches `document` at import time. That is checked
rather than promised: `headless/purity.test.ts` crawls the transitive import
graph and fails the build on any framework import or top-level DOM access.

Practically: this runs in Node, a Worker, a test file, or under any UI
framework.

## Renderers

| Package | Renders with |
|---|---|
| [`@ripple-ui/svelte`](../svelte) | Svelte 5 |

Writing another one means implementing a function over `ResolvedNode` —
every node carries its resolved props, its bound state path plus the
prop/event pair to wire it to, and its raw handler specs.

## Docs

Full documentation lives in [`docs/`](../../docs) at the repo root. The
headless runtime specifically: [`docs/headless.md`](../../docs/headless.md).

## License

MIT
