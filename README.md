# @ripple-ui/svelte

A Svelte 5 component library that renders interactive UIs from declarative JSON specifications. Designed for AI-generated interfaces — an LLM produces a JSON spec, and Ripple renders it as a fully reactive UI.

## Features

- **JSON-driven rendering** — Define UIs as data, not code
- **Two spec formats** — Low-level UISpec (v1.0) for full control, or high-level UniversalSpec (v2.0) for intent-based UIs
- **30+ built-in widgets** — Layout, display, input, data, control flow, and composite widgets
- **Reactive expressions** — `{state.user.name}` syntax with comparisons, ternary, and logical operators
- **State management** — Svelte 5 rune-based with dot-notation path access
- **Event system** — Declarative handlers for state updates, API calls, navigation, toasts, and custom events
- **Intent system** — Auto-layout engine, pattern detection (quiz, charts, results), and multi-step flow chaining
- **Extensible** — Register custom widgets at runtime
- **Theming** — shadcn-svelte tokens with full color/radius/mode overrides

## Installation

```bash
bun add @ripple-ui/svelte
```

Requires **Svelte 5** (`^5.0.0`).

## Quick Start

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';

  const spec = {
    version: '1.0',
    state: { count: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: 4 },
      children: [
        { type: 'heading', props: { text: 'Counter', level: 2 } },
        { type: 'text', props: { text: 'Count: {state.count}' } },
        {
          type: 'button',
          props: { label: '+1' },
          on_click: { action: 'set', target: 'count', value: '{state.count}' }
        }
      ]
    }
  };
</script>

<Ripple {spec} />
```

## Spec Formats

### UISpec (v1.0) — Full Control

Explicit widget tree with props, events, and control flow:

```json
{
  "version": "1.0",
  "state": { "query": "" },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": 3 },
    "children": [
      { "type": "input", "props": { "placeholder": "Search..." }, "bind": "{state.query}" },
      {
        "type": "if",
        "condition": "{state.query != ''}",
        "children": [{ "type": "text", "props": { "text": "Searching: {state.query}" } }]
      }
    ]
  }
}
```

### UniversalSpec (v2.0) — Intent-Based

Declare what the UI should do, and Ripple picks the layout:

```json
{
  "version": "2.0",
  "intent": "browse",
  "title": "Products",
  "data": {
    "items": [
      { "id": "1", "name": "Widget", "image": "/img/widget.jpg", "price": "$9.99" }
    ]
  },
  "fields": { "title": "name", "image": "image", "subtitle": "price" },
  "selection": "single"
}
```

## Built-in Widgets

| Category | Widgets |
|----------|---------|
| **Layout** | `container`, `flex`, `grid`, `card`, `tabs`, `dashboard`, `dashboard-slot` |
| **Display** | `text`, `heading`, `image`, `badge`, `progress`, `avatar`, `metric`, `feed` |
| **Input** | `button`, `input`, `select`, `checkbox`, `switch` |
| **Data** | `table`, `chart` |
| **Control** | `if`, `each` |
| **Composite** | `terminal` |

## Expressions

Reactive bindings using `{expression}` syntax:

```
{state.user.name}              — State path
{item.price}                   — Loop variable
{state.count > 0}              — Comparison
{state.active ? 'On' : 'Off'}  — Ternary
{state.a && state.b}           — Logical AND
{!state.loading}               — Negation
```

## Event Handling

Declarative handlers with 8 action types:

```json
{
  "on_click": [
    { "action": "set", "target": "loading", "value": true },
    { "action": "api", "url": "/api/save", "method": "POST" },
    { "action": "toast", "message": "Saved!", "variant": "success" }
  ]
}
```

| Action | Behavior |
|--------|----------|
| `set` | Update state |
| `open` | Set state to true (dialog shorthand) |
| `api` | HTTP request (emitted to parent) |
| `navigate` | URL navigation (emitted to parent) |
| `toast` | Show notification (emitted to parent) |
| `emit` | Custom event (emitted to parent) |
| `pin` / `unpin` | Sidebar persistence (emitted to parent) |

## Custom Widgets

```typescript
import { registerWidget } from '@ripple-ui/svelte';
import MyWidget from './MyWidget.svelte';

registerWidget('my-widget', MyWidget);
```

## Development

```bash
bun install        # Install dependencies
bun run dev        # Dev server with playground
bun run build      # Build library to dist/
bun run check      # Type-check
bun run test       # Run tests
```

## Documentation

Full documentation in [`docs/`](./docs/):

- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [UISpec Reference](./docs/ui-spec.md)
- [UniversalSpec Reference](./docs/universal-spec.md)
- [Widgets](./docs/widgets.md)
- [Expressions](./docs/expressions.md)
- [State Management](./docs/state-management.md)
- [Event Handling](./docs/event-handling.md)
- [Intent System](./docs/intent-system.md)
- [Theming](./docs/theming.md)
- [Custom Widgets](./docs/custom-widgets.md)
- [API Reference](./docs/api-reference.md)

## License

MIT
