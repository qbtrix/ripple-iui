---
{
  "title": "C4 Widget Public API Barrel — Exports for Component, Types, and Layout",
  "summary": "The barrel export file for the C4 diagram widget subsystem. It re-exports the `C4Diagram` Svelte component, layout utilities, and all TypeScript type definitions from a single import path, establishing the public API surface of the C4 module.",
  "concepts": [
    "barrel export",
    "C4Diagram",
    "C4DiagramData",
    "C4System",
    "C4Container",
    "C4Person",
    "C4Component",
    "C4Relationship",
    "C4NodeData",
    "LayoutNode",
    "public API",
    "module index",
    "tree-shaking"
  ],
  "categories": [
    "module",
    "widget",
    "diagram"
  ],
  "source_docs": [
    "37396c86a22fe1b2"
  ],
  "backlinks": null,
  "word_count": 335,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/c4/index.ts` is the single entry point for consumers of the C4 widget. Rather than importing from internal paths like `./C4Diagram.svelte` or `./elk-layout.js`, callers import everything from `@ripple/widgets/c4` (or the relative equivalent). This pattern is standard in library design and carries real maintenance benefits.

## What Is Exported

### Component
```typescript
export { default as C4Diagram } from './C4Diagram.svelte';
```
The main renderable component. Named export (not default) so it can be tree-shaken and used alongside other named imports.

### Layout Utilities
```typescript
export { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
```
These are exported because callers may want to pre-compute layouts server-side or in tests without mounting the Svelte component.

### Types
```typescript
export type {
  C4Person, C4System, C4Container, C4Component,
  C4Relationship, C4Element,
  C4Diagram as C4DiagramData,
  C4NodeData,
  LayoutNode,
} from './types.js';
```

Note the alias `C4Diagram as C4DiagramData` — this avoids a name collision between the Svelte component (`C4Diagram`) and the TypeScript interface (`C4Diagram` from `types.ts`). Both exist at the same public scope, so one must be renamed. The data type becomes `C4DiagramData` to signal that it carries diagram data, not a component reference.

## Why a Barrel File Matters

Without a barrel, consumers would write:
```typescript
import C4Diagram from '../../widgets/c4/C4Diagram.svelte';
import type { C4System } from '../../widgets/c4/types.js';
import { computeElkLayout } from '../../widgets/c4/elk-layout.js';
```

With the barrel, they write:
```typescript
import { C4Diagram, computeElkLayout } from '$lib/widgets/c4';
import type { C4System, C4DiagramData } from '$lib/widgets/c4';
```

This also lets the internal file structure change freely — as long as `index.ts` keeps exporting the same names, no consumer code breaks.

## Versioning Note

The file header notes a 2026-04-07 update for the SvelteFlow + ELK rewrite. The previous SVG-based implementation had a different internal structure, but this barrel's export names remained stable — callers importing `C4Diagram` did not need to change.

## Known Gaps

No known gaps. This file is intentionally minimal. If the C4 widget gains sub-widgets (e.g., a dedicated `C4Legend` component), they should be added here before being consumed by external code.