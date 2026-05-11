# Ripple UI Documentation

Welcome to the **@ripple-ui/svelte** documentation. Ripple is a Svelte 5 component library that renders interactive UIs from declarative JSON specifications — designed for AI-generated interfaces.

## Table of Contents

1. [Getting Started](./getting-started.md) — Installation, basic usage, and your first spec
2. [Architecture](./architecture.md) — How Ripple works under the hood
3. [UISpec Reference (v1.0)](./ui-spec.md) — Low-level widget tree specification
4. [UniversalSpec Reference (v2.0)](./universal-spec.md) — High-level intent-based specification
5. [Widgets](./widgets.md) — Reference for the 150+ built-in widgets (layout, display, input, data, overlay, composite, research, vertical, control)
6. [Expressions](./expressions.md) — Binding syntax, operators, and template strings
7. [State Management](./state-management.md) — Reactive state with dot-notation paths
8. [Event Handling](./event-handling.md) — Actions, chaining, and the event system
9. [Intent System](./intent-system.md) — Layout engine, pattern detection, and chaining
10. [Theming](./theming.md) — Color tokens, dark mode, and theme overrides
11. [Custom Widgets](./custom-widgets.md) — Extending Ripple with your own widgets
12. [API Reference](./api-reference.md) — All exports, types, and functions

> **Manifest as source of truth.** Every widget's prop schema and runnable example is shipped in `dist/manifest.json` (also served at `/manifest.json` in dev). When the docs and the manifest disagree, the manifest is canonical — it's generated from the same TypeScript declarations the runtime consumes.
