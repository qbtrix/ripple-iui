---
{
  "title": "Widget Registry — Central Component Map and Registration API",
  "summary": "The top-level widget registry for Ripple's generative UI runtime. It maintains a mutable map of string type names to Svelte components, provides a CRUD API for runtime registration, and serves as the single import point for all 40+ built-in widgets across layout, display, input, data, control, composite, overlay, research, workflow, and C4 categories.",
  "concepts": [
    "widget registry",
    "WidgetMap",
    "runtime registration",
    "component catalog",
    "registerWidget",
    "resetRegistry",
    "kebab-case type names",
    "module-level state",
    "default registry",
    "widget taxonomy"
  ],
  "categories": [
    "architecture",
    "state-management",
    "widget",
    "generative-ui"
  ],
  "source_docs": [
    "738e6e20bcf34c5e"
  ],
  "backlinks": null,
  "word_count": 467,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/index.ts` is the nerve center of Ripple's widget system. It does two things: it defines the full default widget set by importing all built-in components and mapping them to string type names, and it exposes a runtime API that lets consumers add, remove, and introspect the registry.

## The WidgetMap Type

```typescript
export type WidgetMap = Record<string, Component<any>>;
```

This is the canonical type for the registry format. It was renamed from `WidgetRegistry` to `WidgetMap` to free the `WidgetRegistry` name for the runtime class in `core/widget-registry.ts` (which manages per-render widget instances, not the component catalog). This rename is tracked in the file's header comment.

## Default Registry

The `defaultRegistry` object maps 40+ type strings to imported Svelte components:

```typescript
const defaultRegistry: WidgetMap = {
  container: Container,
  flex: Flex,
  // ... 40+ entries across all categories
  'confirm-dialog': ConfirmDialog,
  // Aliases
  label: Text,
};
```

Type strings use kebab-case for multi-word types (e.g., `'glass-card'`, `'soul-status'`). The `label` alias maps to `Text`, providing backward compatibility for specs that use the older `label` type.

## Runtime Registration API

```typescript
export function registerWidget(type: string, component: Component<any>): void
export function unregisterWidget(type: string): void
export function hasWidget(type: string): boolean
export function getWidgetTypes(): string[] => string[]
export function resetRegistry(): void
```

The mutable `registry` variable starts as a shallow copy of `defaultRegistry`. `registerWidget` and `unregisterWidget` mutate this live copy. `resetRegistry` restores it from `defaultRegistry` — this is the critical test isolation mechanism, allowing test suites to register mock widgets and then reset cleanly between tests without affecting the default set.

## Why Mutable State at Module Level?

A module-level mutable registry means there is a single shared registry instance per JavaScript context. This is intentional for Ripple's use case: all render calls in an application share the same widget catalog, so custom widgets registered once are available everywhere. The tradeoff is that tests must call `resetRegistry()` in teardown to avoid cross-test pollution.

## Widget Categories

The registry spans 10 categories:

| Category | Examples |
|----------|----------|
| layout | container, flex, grid, card, tabs, dashboard, modal |
| display | text, heading, stat, progress, skeleton, soul-status |
| input | button, input, select, checkbox, switch, textarea |
| data | table, chart |
| control | if, each |
| composite | terminal |
| overlay | confirm-dialog |
| research | source-card, ticker, kv-table, timeline, analyst-bar |
| workflow | workflow |
| c4 | c4 |

## Known Gaps

- `getWidget` is defined in the source but absent from the exported function list in the AST-extracted structure, suggesting there may be a discrepancy between what is defined and what is explicitly exported.
- No validation that a registered `type` string follows kebab-case convention — a consumer calling `registerWidget('MyWidget', ...)` with PascalCase would create an inconsistency with the default registry naming pattern.