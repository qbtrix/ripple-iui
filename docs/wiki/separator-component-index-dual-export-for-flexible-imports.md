---
{
  "title": "Separator Component Index — Dual Export for Flexible Imports",
  "summary": "The barrel export file for the Separator UI component that exposes the root implementation under both a plain `Root` alias and a semantic `Separator` alias. This dual-export pattern lets consumers choose between namespace-style and direct-import ergonomics.",
  "concepts": [
    "barrel export",
    "dual alias export",
    "Root alias",
    "Separator alias",
    "namespace import",
    "named import",
    "index.ts pattern",
    "SvelteKit module resolution",
    "component index",
    "re-export"
  ],
  "categories": [
    "layout",
    "component-system",
    "module-organization"
  ],
  "source_docs": [
    "beeaaaab286f1aef"
  ],
  "backlinks": null,
  "word_count": 442,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This file is the public entry point for the Separator component. It follows Ripple's standard barrel export pattern: re-export the implementation once under its primitive name (`Root`) and once under the component's semantic name (`Separator`). Consumers can import whichever form matches their code style.

## Implementation

```typescript
import Root from "./separator.svelte";

export {
  Root,
  //
  Root as Separator,
};
```

## Why Two Export Names

### Namespace Import Pattern

```typescript
import * as Separator from "$lib/components/ui/separator/index.js";
// Usage: <Separator.Root />
```

This pattern mirrors how bits-ui exports its primitives. It allows destructured usage where the namespace communicates component family membership. When building composite components (like `SelectSeparator`), importing `{ Separator }` reads naturally: "use the Separator component from the separator module."

### Named Import Pattern

```typescript
import { Separator } from "$lib/components/ui/separator/index.js";
// Usage: <Separator />
```

This is ergonomic for direct page or layout usage where developers want to drop in a divider without namespace ceremony. `<Separator />` reads more clearly than `<Root />` in a page template.

## The Comment Separator

The `//` comment between `Root` and `Root as Separator` in the export block is a visual convention used across all Ripple index files. It visually groups primitive exports (above the comment) from semantic alias exports (below the comment). This makes it immediately apparent when reading the file whether a given export is a primary primitive or a convenience alias.

## Why Not Export Both Independently

Exporting `Root as Separator` rather than two separate imports ensures that a single component definition is behind both names. If `Separator.svelte` is updated, both the `Root` import and the `Separator` import reflect the change automatically. There is no risk of the two diverging.

## Consumer Usage

Within Ripple, the primary consumer is `SelectSeparator`, which imports via the named export:

```typescript
import { Separator } from "$lib/components/ui/separator/index.js";
```

External application code can use either form depending on preference. The `index.js` extension in the import path is required for SvelteKit's module resolution in browser builds.

## Known Gaps

- There is only one sub-component (`Root` / `separator.svelte`). More complex component families in Ripple (like Sheet or Select) export 8-10 named parts. The Separator is intentionally simple — it has no trigger, content, or context; it is a single-element divider.
- No TypeScript types are re-exported from this index. Callers who need the props type must import directly from bits-ui: `import type { Separator as SeparatorPrimitive } from 'bits-ui'`.

## Summary

The Separator index file is a minimal two-alias barrel export. Its design optimizes for consumer ergonomics — both namespace-style and direct imports work — while ensuring a single source of truth for the component definition.