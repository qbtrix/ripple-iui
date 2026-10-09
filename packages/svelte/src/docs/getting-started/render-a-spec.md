---
title: Render a spec
description: Pass a JSON spec to the Ripple component and get a working, stateful UI.
order: 2
---

A spec is a JSON object with an optional `state` and a `ui` tree. Each node has a `type` (a widget from the catalog), `props`, and optional `children`. Give it to `<Ripple>` and you have a working interface.

## The component

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';

  const spec = {
    version: '1.0',
    state: { name: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'input', bind: 'name', props: { label: 'Your name' } },
        { type: 'text', props: { text: 'Hello, {state.name}!' } }
      ]
    }
  };
</script>

<Ripple {spec} />
```

## What it renders

This is the same spec, live. Type in the field:

```ripple
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

Three things make it work:

- `state` holds the data. Paths use dot notation, so `state.user.name` works.
- `bind` wires an input to a state path in both directions.
- Any string can hold an expression in braces, such as `{state.name}`, `{state.count + 1}` or `{state.done ? 'Yes' : 'No'}`. Ripple resolves it at render time and again whenever the state it reads changes.

## Handle events

Buttons fire action chains through `on_click`. Actions like `set`, `toggle`, `push` and `remove` change state inside the render. Actions that need your app, such as `api`, `navigate`, `toast` and `emit`, arrive at the `onEvent` callback:

```svelte
<Ripple {spec} onEvent={(event) => console.log(event.type, event)} />
```

The spec never calls into your app directly. It sends a request, and your handler decides what to do with it.

## Props

| Prop | What it does |
|---|---|
| `spec` | The spec to render. |
| `state` | Values merged over `spec.state`. |
| `onEvent` | Receives the actions the spec asks your app to perform. |
| `streaming` | A store from `streamSpec`. See [Stream a spec](/docs/getting-started/stream-a-spec). |
| `skeleton` | The placeholder shown while a stream has nothing to render yet: `card` (default), `dashboard`, `text` or `none`. |

The full widget catalog, with every prop schema and an example per widget, is in [manifest.json](/manifest.json).
