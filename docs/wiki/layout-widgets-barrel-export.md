---
{
  "title": "Layout Widgets Barrel Export",
  "summary": "The barrel export for Ripple's layout widget family, re-exporting nine layout primitives from a single entry point. Phase 4 additions (`GlassCard`, `Modal`) are noted in the file comment, establishing a versioned changelog for the layout surface.",
  "concepts": [
    "barrel export",
    "re-export",
    "layout widgets",
    "widget registry",
    "NodeRenderer",
    "tree-shaking",
    "GlassCard",
    "Modal",
    "Phase 4",
    "module index",
    "DashboardRenderer"
  ],
  "categories": [
    "layout",
    "module",
    "widget"
  ],
  "source_docs": [
    "90b3459785db008d"
  ],
  "backlinks": null,
  "word_count": 369,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This `index.ts` is the public entry point for `lib/widgets/layout/`. It exports nine layout widgets under stable named exports:

```typescript
export { default as Container } from './Container.svelte';
export { default as Flex } from './Flex.svelte';
export { default as Grid } from './Grid.svelte';
export { default as Card } from './Card.svelte';
export { default as GlassCard } from './GlassCard.svelte';
export { default as Tabs } from './Tabs.svelte';
export { default as Dashboard } from './Dashboard.svelte';
export { default as DashboardSlot } from './DashboardSlot.svelte';
export { default as Modal } from './Modal.svelte';
```

## Why a Barrel File?

Centralizing exports here means the `NodeRenderer`, widget registry, and all consumers import from `$lib/widgets/layout` rather than individual `.svelte` file paths. This decouples the public API from the filesystem, allowing internal reorganization without cascading import-site changes.

## The Nine Layout Widgets

| Export | Role |
|--------|------|
| `Container` | Transparent grouping div |
| `Flex` | Flexbox container with semantic props |
| `Grid` | Explicit CSS grid container |
| `Card` | Styled surface with variants and interactive mode |
| `GlassCard` | Glassmorphism card for dark/OS contexts |
| `Tabs` | Tabbed panel navigation |
| `Dashboard` | Auto-fill responsive grid (legacy, non-draggable) |
| `DashboardSlot` | Grid cell wrapper with span control |
| `Modal` | Controlled dialog overlay |

## Phase Changelog

The file comment records Phase 4 additions:

> Updated: Added GlassCard export (Phase 4 — glass design system); added Modal widget

This inline history is deliberate — it marks which exports are stable vs. recently introduced, helping contributors understand the evolution of the layout surface without digging through git history.

## Tree-Shaking

All exports are named re-exports of Svelte components. Vite/Rollup will tree-shake unused widgets at build time — a bundle that only uses `Card` and `Flex` will not include `GlassCard`, `Dashboard`, `DashboardSlot`, `Modal`, etc.

## Known Gaps

- `DashboardRenderer` (the Muuri-based interactive dashboard) is not exported from this barrel. It lives elsewhere in the codebase, creating an asymmetry where `Dashboard` (legacy) is accessible here but its replacement is not.
- No type-only re-export for shared layout prop interfaces (e.g., a `LayoutProps` base type), forcing consumers to import prop types from individual component files.