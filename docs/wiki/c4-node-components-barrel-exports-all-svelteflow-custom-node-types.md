---
{
  "title": "C4 Node Components Barrel — Exports All SvelteFlow Custom Node Types",
  "summary": "widgets/c4/nodes/index.ts exports the eight C4 node components (person, system, container, database, queue, component, group for a boundary, code for the semantic-zoom code panel) and C4_VIEWS, the same components by view name.",
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

`lib/widgets/c4/nodes/index.ts` gathers the node components and maps each to its view name in `C4_VIEWS`. `C4Diagram` registers `C4_VIEWS` as SvelteFlow node types for the legacy diagram, plus `C4ViewNode` under `c4` for semantic zoom.

## Exports

```typescript
export { C4PersonNode, C4SystemNode, C4ContainerNode, C4DatabaseNode, C4QueueNode, C4ComponentNode, C4GroupNode, C4CodeNode };
export const C4_VIEWS = { person, system, container, database, queue, component, group, code }; // the components above
```

## How they are used

In the legacy diagram each element's SvelteFlow type is its view (`getNodeType` picks it). In semantic zoom every node has the type `c4` and its view in `data.view`: `C4ViewNode` (not exported from the barrel) draws that view's component, so an element that opens from a card into a boundary (`group`) or code panel (`code`) swaps its component without SvelteFlow re-measuring the map. The wrapper keeps the class the view's own type would give it (`svelte-flow__node-group`, ...), so per-view styles still apply. `code` is only produced by semantic zoom, for an expanded code element with an excerpt.

## Shared rules

The card-shaped nodes (person, system, container, component) render the classes `c4-node`, `c4-node-kind`, `c4-node-name`, `c4-node-tech`, `c4-node-desc`, `c4-node-docs` and `c4-node-drill`. Their rules live once in `C4Diagram.svelte`, on ripple tokens: the card fills its ELK box, names counter-scale with zoom, and secondary lines drop away when zoomed far out. Every node renders four hidden handles, which only anchor edges. Every node's click goes through `activateNode` (`activate.ts`), which `C4Diagram` also calls on Enter or Space, so keyboard and pointer behave the same for each type. Status rings and the `planned` blueprint treatment are drawn on the SvelteFlow wrapper, so no node component knows about status.

The barrel is internal to the C4 widget; it is not part of `@ripple-ui/svelte/widgets`.
