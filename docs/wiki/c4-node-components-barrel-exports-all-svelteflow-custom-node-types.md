---
{
  "title": "C4 Node Components Barrel — Exports All SvelteFlow Custom Node Types",
  "summary": "The barrel file for the C4 node component directory, re-exporting all seven custom SvelteFlow node types under a single import path. This keeps `C4Diagram.svelte`'s node type registration clean and allows individual node components to be imported independently by consumers.",
  "concepts": [
    "barrel export",
    "C4PersonNode",
    "C4SystemNode",
    "C4ContainerNode",
    "C4DatabaseNode",
    "C4QueueNode",
    "C4ComponentNode",
    "C4GroupNode",
    "node types",
    "SvelteFlow",
    "module index"
  ],
  "categories": [
    "module",
    "widget",
    "diagram"
  ],
  "source_docs": [
    "39312d103168469c"
  ],
  "backlinks": null,
  "word_count": 329,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/c4/nodes/index.ts` collects all seven SvelteFlow custom node components into a single named export surface. It was created alongside the 2026-04-07 SvelteFlow + ELK rewrite when the node directory was established.

## Exports

```typescript
export { default as C4PersonNode }    from './C4PersonNode.svelte';
export { default as C4SystemNode }    from './C4SystemNode.svelte';
export { default as C4ContainerNode } from './C4ContainerNode.svelte';
export { default as C4DatabaseNode }  from './C4DatabaseNode.svelte';
export { default as C4QueueNode }     from './C4QueueNode.svelte';
export { default as C4ComponentNode } from './C4ComponentNode.svelte';
export { default as C4GroupNode }     from './C4GroupNode.svelte';
```

Each Svelte component's default export is named explicitly on re-export — this is required because Svelte components export as `default` internally, and downstream consumers need named imports to use them in `nodeTypes` maps and destructuring.

## Why It Exists

Without this barrel, `C4Diagram.svelte` would import from seven separate paths:

```typescript
import C4PersonNode from './nodes/C4PersonNode.svelte';
import C4SystemNode from './nodes/C4SystemNode.svelte';
// ... five more
```

With the barrel, the import collapses to one line:

```typescript
import {
  C4PersonNode, C4SystemNode, C4ContainerNode,
  C4DatabaseNode, C4QueueNode, C4ComponentNode, C4GroupNode
} from './nodes/index.js';
```

This pattern also means adding a new node type (e.g., `C4MobileNode`) requires only: (1) creating the `.svelte` file, (2) adding one export line here, and (3) registering it in `C4Diagram.svelte`'s `nodeTypes` object. No refactoring of import statements across the codebase.

## Node Type Coverage

| Node | C4 Element | Visual Shape |
|------|------------|-------------|
| `C4PersonNode` | Person | Circle avatar |
| `C4SystemNode` | System (flat) | Rounded rectangle |
| `C4ContainerNode` | Container (general) | Blue-700 card |
| `C4DatabaseNode` | Container (database) | Purple cylinder |
| `C4QueueNode` | Container (queue) | Amber parallelogram |
| `C4ComponentNode` | Component | Blue-500 compact card |
| `C4GroupNode` | System (with containers) | Dashed boundary box |

## Known Gaps

No known gaps. The file is intentionally minimal. If a `C4FileSystemNode` or `C4MobileNode` is added in the future, it should be registered here before being added to `elk-layout.ts` and `C4Diagram.svelte`.