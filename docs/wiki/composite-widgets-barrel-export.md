---
{
  "title": "Composite Widgets Barrel Export",
  "summary": "A single-line barrel file that re-exports all composite widgets from the `composite/` directory under a unified import path. Currently exports `Terminal`; the barrel pattern means consumers need only update their import path once when new composite widgets are added.",
  "concepts": [
    "barrel export",
    "composite widget",
    "module re-export",
    "Terminal",
    "widget registry",
    "tree-shaking",
    "Svelte default export"
  ],
  "categories": [
    "module",
    "composite",
    "barrel"
  ],
  "source_docs": [
    "1ee9a70863ebed13"
  ],
  "backlinks": null,
  "word_count": 258,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple organizes widgets into category directories — `display/`, `data/`, `control/`, `composite/`, etc. Each directory has an `index.ts` barrel that aggregates its exports. This pattern serves three goals:

1. **Consumer ergonomics** — callers write `import { Terminal } from '$lib/widgets/composite'` rather than the full `.svelte` path. This is stable even if the implementation file is renamed.
2. **Controlled surface area** — only widgets explicitly listed in the barrel are part of the public API. Internal helpers can live in the directory without leaking.
3. **Tree-shaking** — bundlers can statically analyze named re-exports and eliminate unused widgets from production bundles.

## Current Export

```typescript
export { default as Terminal } from './Terminal.svelte';
```

The `default as Terminal` form is necessary because Svelte components export themselves as the default export. Re-exporting with a named alias lets consumers use the intuitive `{ Terminal }` destructuring without needing to know the component's internal export convention.

## Composite vs Other Widget Categories

Composite widgets are distinguished from primitive display widgets by their higher internal complexity — they manage their own state, layout, or sub-component composition. `Terminal` fits this pattern because it combines a scrollable output area, optional title bar, and optional input form, all coordinated internally.

Contrast with `display/` widgets (Avatar, Badge, Heading, Image) which are stateless renderers, or `control/` widgets (If, Each) which are structural flow primitives.

## Known Gaps

- As of this writing, `Terminal` is the only composite widget. The directory is likely to grow as richer agent-output widgets are developed (e.g., diff viewers, progress trackers, structured JSON explorers).