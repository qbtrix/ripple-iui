---
{
  "title": "Slider Index — Public API Entry Point",
  "summary": "The slider index module re-exports the Slider component under both its canonical `Root` name and its human-readable `Slider` alias, following ripple's standard barrel file pattern. It acts as the single import surface for all downstream consumers of the slider widget.",
  "concepts": [
    "barrel file",
    "index module",
    "re-export",
    "Root alias",
    "namespace import",
    "named import",
    "public API",
    "module resolution",
    "tree shaking",
    "Slider"
  ],
  "categories": [
    "ui",
    "slider",
    "module-organization"
  ],
  "source_docs": [
    "0e2bda41f2c93303"
  ],
  "backlinks": null,
  "word_count": 384,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

In ripple's component library architecture, every UI widget has a barrel index file (`index.ts`) that defines the public API surface. This is not boilerplate — it serves a specific and important purpose: decoupling internal file organization from the external import contract.

```typescript
import Root from "./slider.svelte";

export {
  Root,
  //
  Root as Slider,
};
```

## Why Barrel Files Matter

**Import stability**: Consumers import from `$lib/components/ui/slider`, not from `$lib/components/ui/slider/slider.svelte`. If the internal file is ever renamed, split, or restructured, no consumer imports break — only the index file changes.

**Dual-name exports**: The same component is exported as both `Root` and `Slider`. This supports two consumption styles:

```typescript
// Namespace import style (used in compound components)
import * as Slider from "$lib/components/ui/slider";
// <Slider.Root ...>

// Named import style (used for standalone usage)
import { Slider } from "$lib/components/ui/slider";
// <Slider ...>
```

The namespace style is especially common in pages that use multiple widgets — `import * as Slider from ...` alongside `import * as Switch from ...` — since it avoids name collisions at the import site.

## Consistency Across the Component Library

This exact pattern — `Root` plus a descriptive alias — repeats across every widget in ripple: Switch, Table, Sheet, Select, and so on. Maintaining this pattern means:

- Tooling (IDE autocompletion, tree-shaking, module resolution) works identically across all components
- Developers learn the pattern once and apply it everywhere
- Automated codemods or refactoring scripts can operate on a predictable structure

## The Comment Separator

The `//` comment between `Root` and `Root as Slider` is a style choice — it visually separates the canonical export from the alias exports. In larger index files (like the Table index, which has eight exports), this separator divides "primary" from "convenience" names, making the file scannable.

## What This File Does NOT Do

- It does not re-export sub-components (the Slider only has one component, unlike Sheet or Table)
- It does not export TypeScript types (those come from bits-ui's SliderPrimitive directly when needed)
- It does not apply any transformation or configuration

## Known Gaps

None. The file is intentionally minimal. If slider sub-components are added in the future (e.g., a `SliderLabel` or `SliderOutput`), they would be added here as additional named exports following the same `ComponentName as SliderComponentName` alias pattern.