# Architecture

## Overview

Ripple is a JSON-to-UI rendering engine. An LLM (or any producer) generates a declarative JSON spec, and Ripple renders it as a fully interactive Svelte component tree.

```
JSON Spec ──► Normalizer ──► Ripple.svelte ──► NodeRenderer ──► Widget Tree
                                  │
                          ┌───────┼───────┐
                          ▼       ▼       ▼
                    StateManager  EventDispatcher  ExpressionResolver
```

## Core Pipeline

### 1. Normalization (`src/lib/core/normalizer.ts`)

All specs pass through `normalizeSpec()` which converts any input to a `UniversalSpec`:

- **UniversalSpec** (has `intent`) — passed through as-is
- **UISpec** (has `ui` but no `intent`) — wrapped as `intent: 'custom'` with the widget tree preserved
- **Invalid input** — falls back to an empty container

The normalizer is deliberately lightweight (no Zod validation) to avoid overhead in reactive rendering.

### 2. Ripple Component (`src/lib/Ripple.svelte`)

The root component that:

1. Normalizes the incoming spec via `$derived`
2. Merges `spec.state` with any `state` prop overrides
3. Creates a `StateManager` and `EventDispatcher`
4. Provides them via Svelte's `setContext()` with these keys:
   - `ui-state` — `StateManager` instance
   - `ui-events` — `EventDispatcher` instance
   - `ui-data` — Reactive data store for fetched data
   - `ui-widget-resolver` — `getWidget()` function from the registry
   - `ui-widget-registry` — per-instance `WidgetRegistry` that backs the
     `invoke` flow action (see [flow-actions.md](./flow-actions.md))

### 3. NodeRenderer (`src/lib/components/NodeRenderer.svelte`)

The recursive renderer that processes each `UINode`:

1. **Visibility**: Evaluates the `show` expression to determine if the node should render
2. **Props resolution**: Resolves all expression bindings in `props` via `resolveValue()`
3. **Widget lookup**: Gets the Svelte component from the widget registry
4. **Event binding**: Creates handler functions for `on_click`, `on_change`, `on_submit`, `on_focus`, `on_blur`
5. **State binding**: Resolves `bind` to get the current value from state
6. **Control flow**: Special handling for `if` (conditional) and `each` (loop) node types
7. **Recursion**: Renders children via self-import (`import Self from './NodeRenderer.svelte'`)

### 4. Expression Resolution (`src/lib/core/expression-resolver.ts`)

Resolves `{expression}` bindings in props and conditions. The resolver context includes:

- `state` — The reactive state proxy from StateManager
- `data` — Results from data fetchers
- `item` / `index` — Current loop variables
- Custom names — From `item_as` / `index_as` in `each` loops

### 5. Event Dispatching (`src/lib/core/event-dispatcher.ts`)

Processes event handlers defined on nodes:

- **`set`** — Directly mutates state via `StateManager.set()`
- **`open`** — Sets a state path to `true` (shorthand for dialogs)
- **External actions** (`api`, `navigate`, `toast`, `emit`, `pin`, `unpin`) — Emitted to the parent app via the `onEvent` callback

Handlers can be chained (array of handlers) and expressions in URLs/body/headers are resolved at invocation time.

## State Reactivity

Ripple uses Svelte 5 runes throughout:

- `StateManager` uses `$state` for the state object — property access is automatically tracked
- `NodeRenderer` uses `$derived.by()` for computed values (resolved props, visibility, bound values)
- Event handlers get a **fresh** resolver context at invocation time, ensuring they always see current state

### Reactivity Optimization

The `NodeRenderer` performs a one-time check (`nodeHasExpressions`) to determine if a node uses any expressions. Static nodes skip state tracking entirely, avoiding unnecessary re-computations.

## Widget System

Widgets are regular Svelte 5 components registered in a central map (`src/lib/widgets/index.ts`). The registry supports:

- Looking up components by string type name
- Registering custom widgets at runtime
- Unregistering or resetting the registry

All built-in widgets wrap shadcn-svelte primitives (`src/lib/components/ui/`) with Ripple-specific integration (expression resolution, state binding, event forwarding).

## Intent System (`src/lib/intent/`)

For UniversalSpec v2.0, the intent system provides:

- **Layout Engine** — Auto-selects the best layout based on intent, data shape, and display hints
- **Pattern Detector** — Identifies semantic patterns (quiz, results, chart) from data structure
- **Chain Executor** — Manages multi-step intent flows with history navigation and quiz scoring

## Directory Structure

```
src/lib/
├── Ripple.svelte              # Root component
├── index.ts                   # Public API exports
├── types.ts                   # RippleEvent type
├── utils.ts                   # cn() utility
├── styles.css                 # Tailwind import
├── core/                      # Engine
│   ├── state-manager.svelte.ts
│   ├── event-dispatcher.ts
│   ├── expression-resolver.ts
│   └── normalizer.ts
├── schema/                    # Zod schemas & types
│   ├── ui-spec.ts
│   ├── universal-spec.ts
│   ├── event-handler.ts
│   └── widget-types.ts
├── widgets/                   # Widget implementations
│   ├── layout/                # container, flex, grid, card, tabs, dashboard
│   ├── display/               # text, heading, image, badge, progress, avatar, metric, feed
│   ├── input/                 # button, input, select, checkbox, switch
│   ├── data/                  # table, chart
│   ├── control/               # if, each
│   ├── composite/             # terminal
│   └── index.ts               # Widget registry
├── components/
│   ├── NodeRenderer.svelte    # Recursive renderer
│   └── ui/                    # shadcn-svelte components
└── intent/
    ├── layout-engine.ts
    ├── pattern-detector.ts
    └── chain-executor.svelte.ts
```
