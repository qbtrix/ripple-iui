# Ripple

A spec engine for AI-generated interfaces, and the renderers that draw it.

An LLM emits a small JSON document describing what a UI should be. Ripple
turns it into a live, interactive interface with state, two-way bindings,
expression evaluation, and event handling. The model writes structure;
Ripple handles reactivity.

```json
{
  "version": "1.0",
  "state": { "name": "" },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      { "type": "input", "bind": "name", "props": { "label": "Your name" } },
      { "type": "text", "props": { "text": "Hello, {state.name}!" } }
    ]
  }
}
```

That spec is a working two-way-bound form. No glue code.

## Packages

| Package | What it is |
|---|---|
| [`@ripple-ui/core`](packages/core) | The engine: schema, expressions, state, events, motion compilation, and a headless runtime that resolves a spec into a plain tree. **No framework dependency.** |
| [`@ripple-ui/svelte`](packages/svelte) | The Svelte 5 renderer: 189 widgets, the visual editor, streaming, intents. Depends on core. |

Most people installing Ripple to build a UI want `@ripple-ui/svelte`; core
comes with it. Reach for core directly when you want the engine without a
renderer — resolving specs on a server, testing them without a DOM, or
building a renderer for another framework.

## The split, and why it's shaped this way

Almost all of Ripple was never Svelte-specific. State, expression
resolution, and the event dispatcher are plain TypeScript classes. What
needed a browser was the tree *walk* — deciding which nodes render, with
what props — and only because it lived inside a Svelte component.

Pulling that walk out left a genuine engine/renderer boundary, so the
packages fall on it:

```
@ripple-ui/core            @ripple-ui/svelte
  schema                     widgets (189)
  expressions                components
  state (StateStore)         Ripple.svelte
  event dispatcher           editor, intents, streaming
  motion compiler            rune StateManager
  headless runtime           motion player (a Svelte action)
```

Three things cross the boundary by injection rather than import, because the
engine must never reach into a renderer:

- **The widget catalog.** `validateCatalog` takes its widget types as an
  argument; the Svelte package binds its own registry.
- **The motion player.** Playing an animation needs a DOM node, so
  `Ripple.svelte` passes a player into the dispatcher.
- **The state store.** Both packages implement `StateStore`. The engine
  depends on the interface, never on either class, which is what lets the
  headless runtime accept the rune-based store from a Svelte host.

The boundary is enforced, not documented: a purity test crawls the
transitive import graph from core's entry point and fails the build on any
framework import or top-level DOM access.

## Working in this repo

```bash
bun install          # links the workspace
bun run build        # builds every package
bun run check        # type-checks every package
bun run test         # tests every package
bun run dev          # the Svelte playground
```

Per-package: `cd packages/core && bun run test`.

## Docs

[`docs/`](docs) covers specs, expressions, state, events, widgets, theming,
and the headless runtime. Start at [`docs/README.md`](docs/README.md).

## License

MIT
