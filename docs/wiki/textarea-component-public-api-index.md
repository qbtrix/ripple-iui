---
{
  "title": "Textarea Component Public API Index",
  "summary": "The barrel file for the Textarea component, re-exporting the single `textarea.svelte` implementation under both `Root` and `Textarea` names. Provides the canonical import point for the component.",
  "concepts": [
    "barrel file",
    "index module",
    "named exports",
    "namespace import",
    "textarea",
    "Root alias",
    "stable import path",
    "single-component barrel",
    "TypeScript",
    "re-export",
    "public API"
  ],
  "categories": [
    "form",
    "input",
    "widget"
  ],
  "source_docs": [
    "3b5f25dfd5d1d9b5"
  ],
  "backlinks": null,
  "word_count": 322,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This `index.ts` is the public entry point for ripple's `Textarea` component. It follows the same barrel pattern used throughout the UI library: a thin module that imports from the implementation file and re-exports under multiple names to support different consumer import styles.

## What Is Exported

```typescript
import Root from "./textarea.svelte";

export {
  Root,
  Root as Textarea,
};
```

The single `textarea.svelte` component is exported twice:

- **`Root`** — For namespace-style imports (`import * as Textarea from "..."; <Textarea.Root />`)
- **`Textarea`** — For named imports that match the component's human-readable identity (`import { Textarea } from "..."; <Textarea />`)

## Why Two Names

The dual-name pattern is consistent across all ripple UI components. `Root` is the structural name used when composing with namespace imports — this mirrors how `bits-ui` and `melt-ui` primitives are typically consumed. `Textarea` is the semantic name that maps to what the component actually does, used when a consumer wants a single named import.

For a single-component module like this one, the barrel file might seem unnecessary overhead. However, it provides two concrete benefits:

1. **Stable import paths** — Consumer imports always point to `$lib/components/ui/textarea`, never to the internal `.svelte` file. If the implementation were split into multiple files or renamed, the public path stays the same.
2. **Consistent API shape** — Every ripple component has an `index.ts`. Developers can reliably destructure from the index without checking whether a given component has sub-components.

## Comparison to Multi-Component Barrels

Contrast this with `tabs/index.ts`, which exports four components plus variant utilities. The Textarea barrel is simpler because `Textarea` has no sub-components (no `TextareaLabel`, no `TextareaDescription`). All complexity lives in the single `.svelte` file.

## Known Gaps

No TODO or FIXME markers. The barrel intentionally exports no TypeScript types — the prop types are inferred from the component definition in `textarea.svelte`. If consumers need the prop type for TypeScript usage, they would need to import `ComponentProps<typeof Textarea>` from Svelte.