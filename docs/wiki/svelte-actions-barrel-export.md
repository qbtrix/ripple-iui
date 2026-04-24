---
{
  "title": "Svelte Actions Barrel Export",
  "summary": "The `actions/index.ts` file is a barrel module that re-exports all Svelte actions from the actions directory as a single import surface. Currently it exports the `reorderable` action and its associated `ReorderableOptions` type.",
  "concepts": [
    "Svelte actions",
    "barrel export",
    "use: directive",
    "reorderable",
    "ReorderableOptions",
    "ESM",
    "TypeScript",
    "drag-to-reorder"
  ],
  "categories": [
    "actions",
    "layout"
  ],
  "source_docs": [
    "9e2818cb0ca0f164"
  ],
  "backlinks": null,
  "word_count": 486,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

Barrel modules (files named `index.ts` that re-export from sibling files) are a standard TypeScript pattern for organizing public APIs within a directory. `actions/index.ts` applies this pattern to Ripple's Svelte action layer.

## What Is a Svelte Action?

A Svelte action is a function with the signature `(node: HTMLElement, options?) => { update?, destroy? }`. Actions are applied with the `use:` directive and let you attach imperative DOM behavior to any element — pointer capture, drag-and-drop, resize observers, keyboard shortcuts — without converting those elements into wrapper components.

Actions are preferable to components when:
- The behavior is orthogonal to the element's visual structure
- The behavior needs to be composable with other behaviors on the same element
- No additional DOM nodes should be introduced

## Current Exports

```typescript
export { reorderable, type ReorderableOptions } from './reorderable.js';
```

- **`reorderable`** — A zero-dependency drag-to-reorder action. See the `reorderable.ts` article for full details.
- **`ReorderableOptions`** — The configuration interface for `reorderable`, exported alongside the action so consumers can type their option objects without importing from the implementation file directly.

## Design Rationale

Exporting `ReorderableOptions` from the barrel (rather than only from the implementation file) follows the principle that the public contract of a module should be accessible from a single import path. Consumers writing typed wrappers or extension hooks should not need to know the internal file structure.

The `.js` extension on the import path (`./reorderable.js`) is required for ESM compatibility in SvelteKit's default Vite configuration, even though the source is TypeScript. Vite resolves `.js` imports to their `.ts` counterparts at build time.

## Extensibility

New actions should be added as `actions/<name>.ts` files and re-exported from this barrel. This keeps the import surface stable — consumers always import from `$lib/actions` and never need to update their paths when the internal file structure changes.

## Relationship to Widget Layer

Svelte actions complement Ripple's widget system but are not the same thing. Widgets are Svelte components registered in the `WidgetRegistry` and rendered by `NodeRenderer` from spec nodes. Actions are lower-level DOM behaviors applied directly to elements, typically inside widget implementations. For example, a `DraggableList` widget might apply `use:reorderable` internally while also being a spec-renderable widget type.

This separation keeps the action layer reusable outside the spec-driven render path — a developer building a custom Svelte page can use `reorderable` directly without writing a spec.

## Consuming from a Host Application

If Ripple is imported as a library, the actions barrel is available at `@ripple/lib/actions` (or whatever the package path resolves to). Because actions are plain TypeScript functions, they tree-shake cleanly — importing `reorderable` does not pull in any other Ripple runtime code.

## Known Gaps

No known gaps. The barrel is intentionally minimal at this stage. As the action library grows (e.g., a `sortable` action for cross-list drag, a `resizable` action for panel resizing), they would each get their own file and a corresponding export line here.