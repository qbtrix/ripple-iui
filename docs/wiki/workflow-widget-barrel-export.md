---
{
  "title": "Workflow Widget Barrel Export",
  "summary": "The public API index for the workflow widget submodule, re-exporting the custom SvelteFlow node component, the auto-layout function, and the TypeScript types that consumers need to construct workflow specs.",
  "concepts": [
    "barrel export",
    "workflow widget",
    "WorkflowNode",
    "autoLayout",
    "WorkflowNodeData",
    "WorkflowEdgeData",
    "type exports",
    "module boundary",
    "SvelteFlow"
  ],
  "categories": [
    "widget",
    "workflow",
    "exports"
  ],
  "source_docs": [
    "1da041ea28730786"
  ],
  "backlinks": null,
  "word_count": 277,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/workflow/index.ts` is a three-line barrel that defines exactly what the workflow widget module exposes to the rest of the Ripple codebase:

```typescript
export { default as WorkflowNode } from './WorkflowNode.svelte';
export { autoLayout } from './layout.js';
export type { WorkflowNodeData, WorkflowEdgeData } from './types.js';
```

## What Gets Exported and Why

### `WorkflowNode`
The SvelteFlow custom node renderer. Exported here so the parent workflow widget (or any consumer) can register it as a node type in the flow canvas without importing from the internal `.svelte` path.

### `autoLayout`
The BFS-based automatic positioning function. Exposed at this level because the parent widget needs to call it when a workflow spec arrives without explicit node coordinates — keeping layout logic out of the rendering layer.

### `WorkflowNodeData` / `WorkflowEdgeData`
Type-only exports. They are exported as `type` (not value) which means bundlers will strip them at compile time with no runtime cost. Consumers use them to type-check pocket specs before passing them to the workflow widget.

## Module Boundary Rationale

The workflow submodule contains four files: the node component, the layout algorithm, the types, and this index. Nothing outside the submodule imports from those internal files directly — all external imports go through this barrel. This makes the submodule replaceable: a future implementation could swap the layout algorithm or the node component without touching any caller.

## Known Gaps

There is no export for the parent workflow orchestrator component itself (the SvelteFlow canvas wrapper). That component presumably lives elsewhere in the library and imports from this index, but it is not exposed here — meaning consumers must assemble the canvas layer themselves if they want custom workflow rendering.