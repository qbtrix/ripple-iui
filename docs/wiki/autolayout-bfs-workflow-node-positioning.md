---
{
  "title": "autoLayout — BFS Workflow Node Positioning",
  "summary": "A pure TypeScript function that computes x/y coordinates for workflow nodes using breadth-first search from root nodes, assigning depth-based horizontal positions and vertically centering each depth column. Includes cycle detection to prevent infinite BFS loops in graphs with back-edges.",
  "concepts": [
    "auto-layout",
    "BFS",
    "graph layout",
    "cycle detection",
    "workflow positioning",
    "depth assignment",
    "H_SPACING",
    "V_SPACING",
    "longest path",
    "disconnected nodes",
    "SvelteFlow"
  ],
  "categories": [
    "layout",
    "workflow",
    "algorithm"
  ],
  "source_docs": [
    "60f2a070a938bbdd"
  ],
  "backlinks": null,
  "word_count": 473,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`autoLayout` solves a common problem in flow-based UIs: users supply workflow specs as flat arrays of nodes and edges, but a canvas renderer needs pixel coordinates for each node. Without this function, every pocket spec author would have to manually specify `position` for every node — a brittle and tedious requirement.

## Algorithm

The layout is a BFS traversal over the node graph:

```typescript
export function autoLayout(
  nodes: WorkflowNodeData[],
  edges: WorkflowEdgeData[]
): Map<string, { x: number; y: number }>
```

**Step 1 — Build the graph.** Adjacency lists and an incoming-edge set are built in O(E). Root nodes are those with no incoming edges.

**Step 2 — Handle pure cycles.** If no roots are found (every node has an incoming edge, i.e. a fully cyclic graph), the algorithm falls back to `nodes[0]` as a synthetic root. Without this fallback, the BFS queue would never be populated and the function would return an empty map — leaving all nodes at position `{0, 0}` and rendering as a single overlapping pile.

**Step 3 — BFS depth assignment.** Each node is assigned the maximum depth reached by any path leading to it (longest-path semantics). This avoids the "diamond collapse" problem where a node reachable via two paths of different lengths gets placed too early, causing edges to go backwards.

**Step 4 — Cycle detection.** Each node tracks how many times it has been re-enqueued via a `visits` map capped at `MAX_VISITS = nodes.length`. Without this cap, a cycle like `A → B → A` would enqueue A and B forever:

```typescript
const kidVisits = visits.get(kid) ?? 0;
if (kidVisits >= MAX_VISITS) continue; // cycle detected
```

**Step 5 — Disconnected nodes.** Nodes never reached by BFS (disconnected subgraphs) default to depth 0. They will stack at the leftmost column rather than disappearing.

**Step 6 — Coordinate assignment.** Horizontal position is `depth * H_SPACING` (200 px per level). Vertical position centers all nodes in a column around y=0:

```typescript
const totalHeight = (nodeIds.length - 1) * V_SPACING;
const startY = -totalHeight / 2;
```

## Spacing Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `H_SPACING` | 200 px | Horizontal gap between depth levels |
| `V_SPACING` | 80 px | Vertical gap between nodes at the same depth |

These are tuned for the `WorkflowNode` minimum width of 160 px, leaving 40 px of breathing room between columns.

## Return Value

A `Map<string, {x, y}>` keyed by node ID. The caller merges these positions into the SvelteFlow node objects only for nodes that lack explicit positions — nodes with user-supplied coordinates are left unchanged.

## Known Gaps

The centering is purely vertical. Wide trees with many branches at one depth level will extend far below the canvas origin without scrolling. There is no port for horizontal centering or viewport fitting after layout.