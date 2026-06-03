---
{
  "title": "Input Component Index — Single-Component Barrel with Dual Export",
  "summary": "The public entry point for Ripple's input component. Exports `input.svelte` under both a short name (`Root`) and a semantic alias (`Input`), following the same dual-export convention used across all Ripple UI component families.",
  "concepts": [
    "barrel file",
    "dual export",
    "Root alias",
    "Input component",
    "stable import path",
    "Ripple conventions",
    "TypeScript index",
    "single-component barrel"
  ],
  "categories": [
    "input",
    "module-system",
    "ui-component"
  ],
  "source_docs": [
    "4e0ad69d49a27194"
  ],
  "backlinks": null,
  "word_count": 232,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `input/index.ts` barrel is the minimal version of the dual-export pattern used throughout Ripple's UI library. Unlike multi-part components (dialog, popover), the input family has a single implementation file, so the index is correspondingly simple.

## Export Pattern

```typescript
import Root from "./input.svelte";

export {
  Root,
  Root as Input,
};
```

The `Root` name is the generic convention used across all Ripple components — every component family has a `Root` export representing its primary element. The `Input` alias provides a readable, self-documenting name for usage sites where context would otherwise be ambiguous.

## Why This Pattern for a Single Component?

Even with one component, the barrel file serves important functions:

1. **Stable import paths** — consumers always import from `$lib/components/ui/input`, never from `$lib/components/ui/input/input.svelte`. This allows internal file reorganization without breaking callers.
2. **Consistency** — all Ripple component families follow the same `index.ts` barrel pattern. A developer familiar with the dialog or popover barrel can immediately understand this one.
3. **Future extension** — if sub-components are added (e.g., `InputAdornment`, `InputGroup`), they can be added to this index without changing existing import paths.

## Usage

```typescript
// Option A — semantic alias
import { Input } from "$lib/components/ui/input";

// Option B — generic Root name (common in template files)
import { Root as Input } from "$lib/components/ui/input";
```

## Known Gaps

None. The file is a minimal, correct barrel with no logic.