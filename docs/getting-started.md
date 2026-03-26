# Getting Started

## Installation

```bash
bun add @ripple-ui/svelte
```

Peer dependency: Svelte 5 (`^5.0.0`).

## Basic Usage

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
        {
          type: 'heading',
          props: { text: 'Hello Ripple', level: 1 }
        },
        {
          type: 'text',
          props: { text: 'Count: {state.count}' }
        },
        {
          type: 'button',
          props: { label: 'Increment' },
          on_click: { action: 'set', target: 'count', value: '{state.count}' }
        }
      ]
    }
  };
</script>

<Ripple {spec} />
```

## Ripple Component Props

| Prop | Type | Description |
|------|------|-------------|
| `spec` | `UniversalSpec \| UISpec \| any` | The JSON specification to render (required) |
| `state` | `Record<string, any>` | State overrides merged on top of spec.state |
| `onEvent` | `(event: RippleEvent) => void` | Callback for external events (api, navigate, toast, emit, pin, unpin) |
| `class` | `string` | CSS class applied to the root wrapper |
| `style` | `string` | Inline style applied to the root wrapper |

## How It Works

1. You provide a JSON spec (either UISpec v1.0 or UniversalSpec v2.0)
2. Ripple normalizes it to a UniversalSpec internally
3. The `NodeRenderer` recursively renders the widget tree
4. Expressions like `{state.count}` are resolved reactively
5. Events trigger state mutations or emit to the parent app

## Development

```bash
bun install          # Install dependencies
bun run dev          # Start dev server with playground at src/routes/
bun run build        # Build library to dist/
bun run check        # Type-check the project
bun run test         # Run tests with vitest
```

## Spec Versions

Ripple supports two specification formats:

- **UISpec (v1.0)** — Low-level, explicit widget trees. You control every layout detail.
- **UniversalSpec (v2.0)** — High-level, intent-based. Declare *what* the UI should do, and Ripple picks the layout.

Both formats work with the `<Ripple>` component. UISpec is automatically normalized to UniversalSpec with `intent: 'custom'`.
