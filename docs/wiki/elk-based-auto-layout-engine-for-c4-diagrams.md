---
{
  "title": "ELK-Based Auto-Layout Engine for C4 Diagrams",
  "summary": "Converts a `C4Diagram` data structure into ELK graph nodes and edges, runs the ELK layered layout algorithm, and returns a flat `Map\u003cid, LayoutPosition\u003e` of computed positions. Replaced an earlier grid-based layout to provide professional, collision-free hierarchical placement.",
  "concepts": [
    "ELK",
    "elkjs",
    "auto-layout",
    "computeElkLayout",
    "isGroupNode",
    "getNodeType",
    "LayoutPosition",
    "ElkLayoutOptions",
    "race condition",
    "per-call instantiation",
    "layered algorithm",
    "C4Diagram",
    "group node",
    "node dimensions"
  ],
  "categories": [
    "layout",
    "diagram",
    "utility"
  ],
  "source_docs": [
    "d43b1d815f8f7305"
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

`elk-layout.ts` is the layout engine for the C4 widget. It translates the C4 data model into an ELK graph, invokes the ELK layered algorithm asynchronously, and returns a position map consumed by `C4Diagram.svelte` to place SvelteFlow nodes.

## Exported API

### `computeElkLayout(diagram, options?)`

The main async function. Takes a `C4Diagram` and optional `ElkLayoutOptions`, returns `Promise<Map<string, LayoutPosition>>`.

```typescript
interface ElkLayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'; // default: 'DOWN'
  nodeSpacing?: number;
  layerSpacing?: number;
}

interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### `isGroupNode(el)`

Returns `true` if a C4 element is a system with containers. Group nodes become ELK parent nodes so their containers render as nested children.

### `getNodeType(el)`

Maps a C4 element to a SvelteFlow node type string (`'person'`, `'group'`, `'system'`, `'database'`, `'queue'`, `'component'`). Classification is done via structural duck-typing — checking which fields are present rather than a discriminant property, because `C4Element` is a union type without a shared `kind` field.

## Node Dimensions

Default dimensions are hardcoded by shape type:

```typescript
const DIMENSIONS = {
  person:   { width: 160, height: 140 },
  database: { width: 180, height: 130 },
  queue:    { width: 200, height: 110 },
  group:    { width: 280, height: 200 },
  default:  { width: 200, height: 110 },
};
```

These dimensions are passed to ELK so it can compute spacing correctly. If dimensions were omitted, ELK would stack nodes without accounting for their visual footprint.

## ELK Instance Per Call

A key architectural decision made on 2026-04-10: ELK is instantiated fresh on each `computeElkLayout` call rather than as a module-level singleton. The original singleton caused a race condition — if two diagrams triggered layout concurrently (e.g., during component mount + prop change), both calls shared one ELK instance and the second call could corrupt the first's graph state. Per-call instantiation is slightly less efficient but eliminates the race entirely.

## Layout Strategy

- Systems with containers become **ELK parent nodes** whose containers are ELK children. This produces proper nested bounding boxes in the output.
- Relationships in the `C4Diagram` map to ELK edges, influencing how ELK routes the layered graph.
- ELK's layered algorithm places nodes in ranks, minimizing edge crossings. Direction defaults to `DOWN` (top-to-bottom flow), matching conventional architecture diagram conventions.

## Output

The function returns a flat `Map<id, LayoutPosition>` rather than a tree. This simplifies consumption: `C4Diagram.svelte` iterates all C4 elements and does a single map lookup per element, regardless of nesting depth.

## Known Gaps

- Group node dimensions (`280 × 200`) are static and may be too small for systems with many containers. A future improvement could compute group size from child count.
- The `direction` option is exposed but there is no UI to change it — only programmatic callers can set it.