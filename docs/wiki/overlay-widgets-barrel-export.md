---
{
  "title": "Overlay Widgets Barrel Export",
  "summary": "The overlay barrel module centralizes all overlay-layer widgets — currently ConfirmDialog — behind a single import path. This pattern keeps widget consumers decoupled from internal file structure and makes tree-shaking predictable.",
  "concepts": [
    "barrel export",
    "overlay widgets",
    "ConfirmDialog",
    "Phase B flow-actions",
    "widget namespace",
    "tree shaking",
    "public API boundary",
    "Svelte component export"
  ],
  "categories": [
    "widget",
    "overlay",
    "module-structure"
  ],
  "source_docs": [
    "1c3bcd2f65bc960c"
  ],
  "backlinks": null,
  "word_count": 431,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `overlay/index.ts` module is a barrel export that acts as the public surface for every widget living in the overlay layer. Overlay widgets are components that render above the normal document flow — confirm dialogs, modals, toasts, and similar interruption-level UI. Grouping them under one index file means any consumer can write `import { ConfirmDialog } from '$lib/widgets/overlay'` without knowing (or caring) how the directory is organized internally.

## Why a Barrel File?

Without a barrel, every import path embeds internal directory structure: `'$lib/widgets/overlay/ConfirmDialog.svelte'`. When files are reorganized or renamed, every consumer breaks. The barrel file absorbs that coupling — only the barrel itself needs updating, and all consumers stay stable.

Barrel files also serve as an intentional API boundary. Anything not re-exported here is considered internal. This matters in a generative UI runtime like Ripple, where widgets are discovered and composed dynamically; the barrel defines exactly what is publicly available for composition.

## Current Exports

```typescript
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
```

Only one widget is exported today: `ConfirmDialog`. The file header indicates this was created alongside ConfirmDialog as part of **Phase B flow-actions** — a feature phase adding interactive, user-confirming actions to Ripple flows. The barrel was created at the same time rather than after the fact, signaling intentional design: the overlay namespace is expected to grow.

## Design Philosophy

Overlay widgets occupy a distinct conceptual layer from content widgets. They are not passive — they block or interrupt user flow and require explicit dismissal or confirmation. Keeping them in their own `overlay/` directory (rather than mixing them with, say, `research/` or `layout/` widgets) enforces that mental model in the file system itself.

The `@changes` annotation in the file header (`Initial creation alongside ConfirmDialog for Phase B flow-actions`) follows Ripple's convention of tracking significant structural changes directly in source. This makes `git log --follow` less necessary for understanding why a file exists.

## Integration Pattern

Consumers import from the barrel:

```typescript
import { ConfirmDialog } from '$lib/widgets/overlay';
```

Svelte's component resolution handles the `.svelte` extension transparently; the barrel re-exports the default export under a named alias, which is the idiomatic way to export Svelte components from TypeScript modules.

## Known Gaps

- The overlay namespace currently holds only `ConfirmDialog`. Other common overlay patterns — alert dialogs, bottom sheets, side drawers — are not yet present. The barrel structure is ready to accommodate them.
- No index typing (e.g. `export type`) is present. If overlay widgets share prop interface types (e.g. a common `onclose` callback type), those types are not yet extracted to this barrel.