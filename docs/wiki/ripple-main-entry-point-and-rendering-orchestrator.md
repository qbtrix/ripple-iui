---
{
  "title": "Ripple — Main Entry Point and Rendering Orchestrator",
  "summary": "Ripple.svelte is the top-level component that accepts a UI spec or a streaming spec store, bootstraps all core services (state manager, event dispatcher, widget registry), and routes rendering to the correct sub-renderer based on spec intent and stream state.",
  "concepts": [
    "Ripple",
    "generative UI",
    "streaming spec",
    "StreamSpecStore",
    "StateManager",
    "EventDispatcher",
    "WidgetRegistry",
    "Svelte context",
    "render modes",
    "skeleton",
    "DashboardRenderer",
    "NodeRenderer",
    "ConfirmDialog",
    "UISpec",
    "UniversalSpec"
  ],
  "categories": [
    "widget",
    "runtime",
    "state-management"
  ],
  "source_docs": [
    "5cbdf38dbf2b39bb"
  ],
  "backlinks": null,
  "word_count": 544,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Ripple.svelte` is the public surface of the Ripple generative UI runtime. Consumers mount exactly one `<Ripple>` per UI surface and pass either a static `spec` or a `StreamSpecStore` for live streaming specs. Everything downstream — state, events, widgets — is scoped to that instance.

## Props

| Prop | Type | Purpose |
|------|------|---------|
| `spec` | `UniversalSpec \| UISpec \| any` | Static UI specification |
| `streaming` | `StreamSpecStore` | Live-streaming spec; replaces static `spec` while stream is active |
| `skeleton` | `'card' \| 'dashboard' \| 'text' \| 'none'` | Skeleton variant shown before first valid parse |
| `state` | `Record<string, any>` | Initial state overrides, merged with spec-embedded state |
| `onEvent` | `OnEventCallback` | Application-level event sink |
| `onSpecChanged` | `(spec: DashboardSpec) => void` | Notifies host when dashboard spec mutates |
| `class` / `style` | `string` | Pass-through styling |

## Service Instantiation

Three services are created per Ripple instance:

1. **`createStateManager(mergedInitialState)`** — Reactive key-value store. Initial state is merged from the spec's embedded `state` field and the external `state` prop, with the external prop taking precedence.
2. **`createWidgetRegistry()`** — Per-instance registry allowing dynamic widget registration. Exposed via context key `ui-widget-registry` so child flows can register custom widgets at runtime.
3. **`createEventDispatcher(stateManager, onEvent, widgetRegistry)`** — Wires state mutations and application callbacks together. The registry is threaded in so action handlers can invoke registered widgets.

All three are pushed into Svelte context so the entire subtree can access them without prop drilling:

```typescript
setContext('ui-state', stateManager);
setContext('ui-events', eventDispatcher);
setContext('ui-data', dataStore);
setContext('ui-widget-resolver', getWidget);
setContext('ui-widget-registry', widgetRegistry);
```

## Streaming Behavior

When a `StreamSpecStore` is provided, `resolvedSpec` is derived from `streaming.current ?? rawSpec`. This means:

- Before the first valid parse arrives (`streaming.current == null && !streaming.done`) → render **skeleton**
- If the stream ends with an error and no current spec → render **stream-error** banner
- Once a spec arrives → switch to normal rendering

This design allows AI-generated UIs to appear progressively without a blank flash, using the skeleton as a loading placeholder.

## Render Modes

`renderMode` is a derived value with five states:

- `skeleton` — stream in progress, no spec yet
- `stream-error` — stream failed with no recoverable spec
- `dashboard` — spec intent is `'dashboard'`, delegates to `DashboardRenderer`
- `node` — spec has a `ui` tree, delegates to `NodeRenderer`
- `empty` — spec exists but has no renderable intent or `ui` field

## Reactive State Sync

An `$effect` watches `initialStateOverride` and pushes changed values into the state manager. This is essential for async data sources: if a parent component fetches data after the initial render and passes it via the `state` prop, the UI updates without remounting.

## Always-Present ConfirmDialog

`<ConfirmDialog />` is mounted unconditionally inside the root `div`. Any confirm action dispatched by the event dispatcher writes a pending confirm into shared state; the dialog reads that state and displays. Mounting it here — rather than at each call site — means no confirm flow requires spec-level wiring.

## Known Gaps

The `dataStore` (`$state<Record<string, unknown>>({})`) is initialized empty and never externally populated in this file. Population presumably happens through event-driven side effects or data source evaluators defined elsewhere. The mechanism connecting data sources to `dataStore` is not visible in this file.