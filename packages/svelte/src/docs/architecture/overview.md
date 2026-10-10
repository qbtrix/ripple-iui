---
title: How Ripple works
description: The two packages, the path a spec takes from JSON to pixels, and the boundaries that keep the engine framework-free.
order: 1
---

Ripple turns a JSON spec into a live interface. A model (or any program) writes the spec. Ripple renders it and passes anything that needs your app to one callback.

## Two packages

| Package | Holds | Depends on |
|---|---|---|
| `@ripple-ui/core` | Schemas, expressions, state, the action dispatcher, motion compilation, the headless runtime, URL safety, manifest helpers | Zod, nothing framework-related |
| `@ripple-ui/svelte` | The `<Ripple>` component, the widget catalog, designed layouts, flows, streaming, the editor | `@ripple-ui/core`, Svelte 5 |

The split follows one rule: anything that needs the Svelte compiler or a DOM lives in the Svelte package, and everything else lives in core. A test walks core's real import graph and fails the build if anything in it imports Svelte or touches `document` or `window` at load time. That is why the [headless runtime](/docs/concepts/headless) runs in Node or a Worker, and why another renderer can be built on core alone.

## From spec to screen

```
spec (JSON)
  -> normalize        UISpec becomes UniversalSpec { intent: 'custom', ui }
  -> <Ripple>         state store, dispatcher, widget registry, context
     -> flow?         chain / chain_map / flowId / onComplete -> FlowRunner
     -> intent?       designed intents -> IntentRenderer -> a layout
     -> ui tree       NodeRenderer, recursively, one node at a time
        -> widget     a Svelte component from the registry
```

**Normalize.** Every input becomes a UniversalSpec. A UISpec keeps its tree under `intent: 'custom'`. Normalizing doesn't run the Zod schema, so it is cheap enough to do on every update of a streaming spec. Call `parseUISpec` yourself when you want strict validation.

**Set up the render.** `<Ripple>` merges `spec.state` with the `state` prop, creates a `StateManager` (a store backed by Svelte's `$state`) and an `EventDispatcher`, and puts them in context for the widgets. It also applies the spec's `theme` and any brand pack as CSS custom properties on its root element.

**Choose a path.** A spec with flow fields is hosted by `FlowRunner`, which renders one step at a time. A designed intent (`form`, `browse`, `select`, `detail` and the rest) goes to a hand-built layout. Anything else renders its `ui` tree.

**Render each node.** `NodeRenderer` takes one node and:

1. evaluates `show` and skips the node when it is falsy;
2. resolves expressions in `props`, `class` and `style`, and filters `style` for unsafe values;
3. looks up the widget component by `type`, or draws an "unknown widget" box;
4. wires `bind` through the widget's binding contract;
5. turns `on_*` handlers into event props that call the dispatcher;
6. expands `if` and `each`, putting loop variables in scope;
7. renders the children, sorted into named slots.

A node with no expressions in it skips state tracking entirely, so a large static tree costs little to keep on screen.

**Run actions.** When a widget fires an event, the dispatcher resolves the action's expressions against current state and runs it. State actions change the store directly, and every widget that read the changed path updates. Actions that need your app go to `onEvent`; for requests, the dispatcher waits for your answer and runs the spec's `on_success` or `on_error` steps.

## Reactivity

State lives in one `$state` object. Widgets read it through resolved props, so Svelte tracks exactly which nodes depend on which paths, and a write updates only those. Action handlers get a fresh context when they run, so they always see current state rather than the state at render time.

The headless runtime implements the same `StateStore` interface without runes. It rebuilds the tree lazily, on the next read after a change.

## Where the renderer plugs into the engine

Core never imports the renderer. Where the engine needs something only a renderer has, the renderer passes it in:

1. **The widget catalog.** Core's `validateCatalog` takes the list of known types as an argument. The Svelte package exports a version bound to its registry.
2. **The animation player.** The dispatcher takes an optional function that plays a `motion` on a DOM node. Without one, as in the headless runtime, `animate` still reaches `onEvent` but plays nothing.
3. **The state store.** The dispatcher and resolver depend on the `StateStore` interface. The Svelte store and the headless store both implement it, and a test holds them to identical behaviour.

## Trust boundaries

A spec is model output and is treated as untrusted:

- Expressions are a small grammar. They can't define functions or run loops, and only a short list of methods runs.
- Every URL a widget puts in an `href` or `src`, and every `navigate` URL, goes through `safeUrl` after expressions resolve, because an expression can assemble a `javascript:` URL.
- Style values go through `safeStyle`, which drops unsafe `url()` targets and script-bearing CSS.
- An unknown widget type renders as a visible error box, never as arbitrary markup.
- Requests, navigation and named server calls are never performed by Ripple. They arrive at your `onEvent` handler, which decides whether to do them.
