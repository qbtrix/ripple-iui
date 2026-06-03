---
{
  "title": "Workflow Widget — Interactive Node-Based Diagram",
  "summary": "A Svelte 5 widget that renders interactive workflow diagrams using SvelteFlow (`@xyflow/svelte`). It accepts a simplified `WorkflowNodeData[]` and `WorkflowEdgeData[]` spec and handles auto-layout, type mapping, and interactivity controls transparently.",
  "concepts": [
    "SvelteFlow",
    "WorkflowNode",
    "WorkflowEdge",
    "autoLayout",
    "node types",
    "interactive",
    "minimap",
    "fitView",
    "Svelte 5 runes",
    "$derived.by",
    "@xyflow/svelte",
    "workflow diagram"
  ],
  "categories": [
    "widget",
    "layout",
    "diagram"
  ],
  "source_docs": [
    "2b9e8c0bd5480f3c"
  ],
  "backlinks": null,
  "word_count": 464,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Workflow.svelte` is the top-level entry point for workflow visualization in Ripple. It bridges a caller-friendly data format (`WorkflowNodeData`) with SvelteFlow's internal `Node`/`Edge` types, runs auto-layout when positions are missing, and exposes a set of behavioral props to control interactivity.

## Props

| Prop | Type | Default | Purpose |
|------|------|---------|--------|
| `nodes` | `WorkflowNodeData[]` | `[]` | Input node definitions |
| `edges` | `WorkflowEdgeData[]` | `[]` | Input edge definitions |
| `title` | `string` | `''` | Optional diagram title |
| `interactive` | `boolean` | `true` | Enables drag/select on nodes |
| `minimap` | `boolean` | `false` | Shows minimap overlay |
| `fitView` | `boolean` | `true` | Auto-fits diagram to viewport |
| `class` | `string` | `''` | Extra CSS class for root element |

## Data Flow

```
WorkflowNodeData[] → $derived flowNodes (Node[])
                                    ↓
                        SvelteFlow renders graph
WorkflowEdgeData[] → $derived flowEdges (Edge[])
```

The `$derived.by` rune computes `flowNodes` reactively. If any input node is missing a `position`, the whole set is passed through `autoLayout`, which returns a `Map<id, {x, y}>`. Nodes with explicit positions skip this entirely — the check is per-node via `n.position ?? layoutPositions.get(n.id)`. A final fallback of `{ x: 0, y: 0 }` prevents undefined positions from crashing SvelteFlow.

## Custom Node Registration

A single custom node type is registered:

```typescript
const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode as any,
};
```

The `as any` cast sidesteps a SvelteFlow type mismatch between Svelte 5 component signatures and the library's expected Svelte 4 shape. This is a known compatibility workaround pending upstream updates.

## Node Mapping

Each `WorkflowNodeData` is mapped to a SvelteFlow `Node` with:
- `type: 'workflowNode'` to route to the custom renderer
- `data` carrying `nodeType`, `label`, `icon`, `tool`, and `status` (defaulting to `'idle'`)
- `sourcePosition: Right` and `targetPosition: Left` for standard left-to-right flow handle placement
- `draggable` and `selectable` both tied to the `interactive` prop — toggling interactive mode at the prop level disables both simultaneously

## Interactivity Controls

The `interactive` prop is the single switch for whether users can manipulate the diagram. Setting it to `false` is intended for read-only embedded views (dashboards, reports) where accidental node dragging would be disruptive.

The `minimap` prop is off by default because most workflow diagrams are small enough to fit in the viewport without navigation assistance. It can be enabled for complex multi-step pipelines.

## Known Gaps

- The `as any` cast on `WorkflowNode` is a compatibility shim for Svelte 5 vs. SvelteFlow's Svelte 4 type expectations. Once `@xyflow/svelte` fully supports Svelte 5 component types, this should be removed.
- Edge rendering details (labels, animated edges, edge types) are handled in the `$derived.by` block for `flowEdges`, which was truncated in the source view but follows the same pattern as `flowNodes`.