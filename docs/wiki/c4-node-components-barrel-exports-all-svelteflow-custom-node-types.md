---
{
  "title": "C4 Node Components Barrel — Exports All SvelteFlow Custom Node Types",
  "summary": "widgets/c4/nodes/index.ts re-exports the eight SvelteFlow node components the C4 widget registers: person, system, container, database, queue, component, group (boundary) and code (the semantic-zoom code panel).",
  "concepts": [
    "barrel exports",
    "SvelteFlow",
    "custom nodes",
    "nodeTypes",
    "C4CodeNode",
    "C4GroupNode"
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
  "word_count": 243,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/c4/nodes/index.ts` gathers the node components so `C4Diagram` registers them from one import.

## Exports

```typescript
export { default as C4PersonNode }    from './C4PersonNode.svelte';
export { default as C4SystemNode }    from './C4SystemNode.svelte';
export { default as C4ContainerNode } from './C4ContainerNode.svelte';
export { default as C4DatabaseNode }  from './C4DatabaseNode.svelte';
export { default as C4QueueNode }     from './C4QueueNode.svelte';
export { default as C4ComponentNode } from './C4ComponentNode.svelte';
export { default as C4GroupNode }     from './C4GroupNode.svelte';
export { default as C4CodeNode }      from './C4CodeNode.svelte';
```

## How they are used

`C4Diagram` maps SvelteFlow node types to them: `person`, `system`, `container`, `database`, `queue`, `component`, `group` and `code`. `getNodeType` picks the type for each element; `code` is only produced by semantic zoom, for an expanded code element with an excerpt.

## Shared rules

The card-shaped nodes (person, system, container, component) render the classes `c4-node`, `c4-node-kind`, `c4-node-name`, `c4-node-tech`, `c4-node-desc`, `c4-node-docs` and `c4-node-drill`. Their rules live once in `C4Diagram.svelte`, on ripple tokens: the card fills its ELK box, names counter-scale with zoom, and secondary lines drop away when zoomed far out. Every node renders four hidden handles, which only anchor edges. Every node's click goes through `activateNode` (`activate.ts`), which `C4Diagram` also calls on Enter or Space, so keyboard and pointer behave the same for each type. Status rings and the `planned` blueprint treatment are drawn on the SvelteFlow wrapper, so no node component knows about status.

The barrel is internal to the C4 widget; it is not part of `@ripple-ui/svelte/widgets`.
