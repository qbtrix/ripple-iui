# @ripple-ui/svelte

A Svelte 5 runtime that turns a JSON spec into a live, interactive UI.

> The engine underneath — schema, expressions, state, events, and a headless
> runtime — is [`@ripple-ui/core`](../core), and it has no framework
> dependency. This package is the Svelte renderer over it. You do not need to
> install core separately; it comes as a dependency.

## What this is

Ripple is the rendering layer for AI-generated interfaces. An LLM (or any other source) emits a small JSON document describing what the UI should look like; Ripple mounts it as a real Svelte component tree with state, two-way bindings, expression evaluation, and event handling. The model writes structure; Ripple handles reactivity.

You don't author Svelte components per screen. You hand Ripple a spec and it builds the UI.

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

That spec is a fully working two-way-bound form. No glue code.

## What it does

Three things, in order of how often you'll touch them:

1. **Renders 150+ typed widgets from JSON.** Every node in the tree (`{ "type": "...", "props": {...}, "children": [...] }`) maps to a Svelte component — `flex`, `card`, `kanban`, `chart`, `comparison-layout`, `wizard-layout`, `pricing-table`, all of them. The full catalog with prop schemas lives in [`dist/manifest.json`](./dist/manifest.json).

2. **Wires state and interactivity declaratively.** `state` is a top-level object on the spec. Inputs use `"bind": "<state-path>"` for two-way binding. Buttons fire `on_click` action chains (`set`, `push`, `remove`, `toggle`, `validate`, `branch`, `confirm`, `api`, `navigate`, `toast`, `emit`). Expressions inside any string — `{state.count + 1}`, `{state.x > 0 ? 'yes' : 'no'}`, `{item.price}` — are resolved at render time against state and loop context.

3. **Hands back events.** Anything the host needs to handle (HTTP calls, navigation, toasts, custom signals) bubbles out via a single `onEvent` callback on the `<Ripple>` component. The spec doesn't reach into your app; it asks the host to do something.

## How it works

The pipeline in five steps:

```
   spec (JSON)
        │
        ▼
  ┌──────────────┐    UISpec → UniversalSpec wrapper
  │  normalizer  │    (or pass-through if already universal)
  └──────┬───────┘
         ▼
  ┌──────────────┐    Svelte 5 $state proxy with dot-notation
  │ StateManager │    `get("user.profile.name") / set("count", 7)`
  └──────┬───────┘
         ▼
  ┌──────────────┐    Resolves `{state.x + 1}`, `{item.field}`,
  │  Expression  │    ternaries, comparisons, method calls.
  │   Resolver   │    Tracks reads inside derived blocks for
  └──────┬───────┘    automatic reactivity.
         ▼
  ┌──────────────┐    Walks the tree, picks the Svelte component
  │ NodeRenderer │    from the registry per `type`, evaluates
  └──────┬───────┘    `show`/`bind`/`on_*`, renders children.
         ▼
  ┌──────────────┐    User clicks → `on_click` chain runs through
  │   Event      │    the dispatcher: state mutations stay local,
  │  Dispatcher  │    side-effecting actions (api/toast/navigate)
  └──────────────┘    fire `onEvent` on the host.
```

Each piece is independent and Svelte 5 native:

- **Normalizer** (`src/lib/core/normalizer.ts`) accepts either spec format and returns a `UniversalSpec`.
- **StateManager** (`src/lib/core/state-manager.svelte.ts`) wraps a Svelte 5 `$state` proxy. Path-based reads/writes auto-create intermediate objects. Subscribe via `stateManager.subscribe(callback)`.
- **ExpressionResolver** (`src/lib/core/expression-resolver.ts`) parses `{...}` strings — paths, arithmetic, comparisons, ternaries, optional chaining, whitelisted methods (`.includes`, `.length`, `.toFixed`, etc.). Detects UINode-shaped subtrees and leaves them raw so they can resolve later in their own loop context.
- **EventDispatcher** (`src/lib/core/event-dispatcher.ts`) executes action chains. State actions (`set`/`push`/`remove`/`toggle`) write through StateManager; control actions (`branch`/`validate`/`confirm`) gate further actions; effect actions (`api`/`navigate`/`toast`/`emit`/`pin`/`unpin`) emit `RippleEvent`s the host can intercept.
- **NodeRenderer** (`src/lib/components/NodeRenderer.svelte`) is the recursive walker. It evaluates `show` conditions, resolves props, builds loop contexts for `each`, manages `bind` two-way wiring, and renders children — including named slots (`header`, `footer`, `sidebar`, `topbar`, `actions`).
- **Widget registry** (`src/lib/widgets/index.ts`) maps `type` strings to Svelte components. Aliases are flat entries (e.g. `dialog → Modal`, `comparison-cards → ComparisonLayout`). Register your own at runtime with `registerWidget(type, component)`.

Reactivity is end-to-end: every state mutation flows through the proxy, Svelte recomputes any derived that read it, and only the affected widget re-renders. There is no virtual DOM diff phase you have to think about — it's the same system Svelte 5 uses for hand-written components.

## Why JSON specs?

Three reasons that compound:

1. **LLMs produce structured data better than they produce code.** A model emits a spec like the one above with high reliability; the same model writing equivalent Svelte code is several times more error-prone.
2. **Specs are inspectable, diffable, persistable.** You can save a UI to a database, send it over the wire, replay it from a log, run a regression test against it. JSX-as-rendered output gives you none of that.
3. **The contract is small.** Every widget's prop schema lives in `dist/manifest.json` (150 widgets, ~270 KB). A model can fetch it once and have a complete catalog, including runnable examples. New widgets ship by adding to the registry — no SDK update on the agent side.

## Features

- **JSON-driven rendering** — Define UIs as data, not code
- **Two spec formats** — Low-level UISpec (v1.0) for full control, or high-level UniversalSpec (v2.0) for intent-based UIs
- **150+ built-in widgets** across nine categories — layout, display, input, data, overlay, control, composite, research, and enterprise verticals
- **Reactive expressions** — `{state.user.name}` syntax with comparisons, ternary, and logical operators
- **State management** — Svelte 5 rune-based with dot-notation path access
- **Event system** — Declarative handlers for state updates, API calls, navigation, toasts, and custom events
- **Intent system** — Auto-layout engine, pattern detection (quiz, charts, results), and multi-step flow chaining
- **LLM-ready manifest** — `dist/manifest.json` ships with every release, declaring every widget's prop schema and a runnable example. Agents can fetch it at runtime to learn the API
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

| Category | Examples | Count |
|----------|----------|-------|
| **Layout** | `flex`, `grid`, `card`, `tabs`, `accordion`, `split`, `master-detail`, `app-shell`, `sidebar`, `page-header`, `hero`, `section`, `breadcrumb`, `dashboard` | 21 |
| **Display** | `text`, `heading`, `image`, `badge`, `metric`, `stat`, `progress`, `progress-ring`, `avatar`, `markdown`, `code-block`, `kbd`, `chip`, `quote`, `definition-list`, `comparison-table`, `pros-cons`, `steps`, `link-preview`, `qr`, `diff` | 33 |
| **Input** | `button`, `input`, `textarea`, `select`, `combobox`, `multi-select`, `checkbox`, `switch`, `radio-group`, `slider`, `rating`, `date-picker`, `time-picker`, `number-input`, `segmented`, `color-picker`, `file-upload`, `form`, `filter-bar`, `search`, `location-picker` | 24 |
| **Data** | `table`, `data-grid`, `chart`, `kanban`, `gantt`, `calendar`, `timeline`, `tree`, `tree-table`, `virtual-list`, `sparkline`, `gauge`, `funnel`, `heatmap`, `sankey`, `treemap`, `map` | 18 |
| **Overlay** | `alert`, `callout`, `tooltip`, `popover`, `dropdown-menu`, `toast`, `command-palette`, `context-menu`, `notification-center`, `error-state`, `coachmark` | 12 |
| **Composite layouts** | `comparison-layout`, `entity-detail`, `form-layout`, `wizard-layout`, `checklist-layout`, `report-layout`, `invoice-layout`, `order-status`, plus dashboard variants (exec/ops/analytics/pipeline/project), `terminal`, `workflow`, `c4` | 16 |
| **Research** | `source-card`, `citation`, `sources-bar`, `discover-card`, `follow-up`, `kv-table`, `news-card`, `ticker`, `company-header`, `callout`, `analyst-bar`, `range-bar` | 13 |
| **Vertical** | `pricing-table`, `settings-list`, `comment-thread`, `audit-log`, `api-key`, `people-picker`, `permission-matrix`, `org-chart`, `invoice-lines`, `bulk-action-bar`, `saved-views` | 11 |
| **Control** | `if`, `each` | 2 |

The complete prop schema and a runnable example for every widget live in **[`dist/manifest.json`](./dist/manifest.json)** (regenerated by `bun run build:manifest`). LLM agents fetch this manifest to learn the API; treat it as the source of truth.

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
bun install              # Install dependencies
bun run dev              # Dev server with playground (also serves /manifest.json)
bun run build            # Build library + manifest to dist/
bun run build:manifest   # Regenerate dist/manifest.json and static/manifest.json
bun run check            # Type-check
bun run test             # Run tests
```

The dev server serves the widget manifest at `http://localhost:5174/manifest.json`. Point your LLM tooling at this URL to develop against live changes.

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
