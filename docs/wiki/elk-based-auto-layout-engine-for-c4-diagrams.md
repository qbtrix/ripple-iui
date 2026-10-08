---
{
  "title": "ELK-Based Auto-Layout Engine for C4 Diagrams",
  "summary": "elk-layout.ts lays out C4 diagrams with ELK's layered algorithm: positions for every element (boundaries as compounds), orthogonal edge routes with reserved label boxes, the semantic-zoom layout with port badges, and the element-to-node-type mapping.",
  "concepts": [
    "ELK.js",
    "layered layout",
    "orthogonal routing",
    "edge labels",
    "compound nodes",
    "semantic layout",
    "getNodeType",
    "isGroupNode"
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
  "word_count": 347,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`elk-layout.ts` turns the C4 data model into an ELK graph, runs the layered algorithm, and hands `C4Diagram` positions and edge routes. ELK is instantiated per call; a shared instance raced between layouts.

## Exported API

- `computeElkLayout(diagram, options?)` returns `Map<id, LayoutPosition>` (absolute `x, y, width, height`).
- `computeElkGraph(diagram, options?)` returns the positions plus `routes: Map<relationshipIndex, EdgeRoute>`, where an `EdgeRoute` is the absolute bend points and the box ELK reserved for the label. Routes are empty if ELK fails, and the widget falls back to smoothstep edges.
- `computeSemanticLayout(tree, vis, edges, sizeOf, ...)` lays out semantic zoom: every drawn element nested to any depth, a boundary as an ELK compound sized around its children (never smaller than its label row, `BOUNDARY_TOP` = 48), port badges as ELK end labels beside the line where it meets a boundary.
- `edgeLabelText(r)` is the label text: the relationship's label, then `[technology]`.
- `getNodeDimensions`, `getNodeType`, `isGroupNode` map an element to its box size and SvelteFlow node type.

`ElkLayoutOptions` takes `direction` (default `DOWN`), `nodeSpacing` (60) and `layerSpacing` (56; each labelled edge adds a label row between layers, so a tighter gap keeps labelled diagrams at a readable zoom).

## Sizes and types

Default boxes: person 160 x 140, database 180 x 130, queue 200 x 110, boundary at least 280 x 200, everything else 200 x 110. An expanded code panel is sized by `codePanelSize` in `semantic.ts` from its line count and wrap.

`getNodeType` honours an explicit `kind` first (`code` draws as a component; `type: 'database' | 'queue'` still picks those shapes; a non-empty `containers` is a `group`). Without `kind` it infers from the fields present: no `technology`, `type`, `containers` or `components` means a person; a non-empty `containers` means a group; `type` database or queue picks that shape; `containers` means system, `components` container; anything else system.

## Coordinates

ELK reports a nested node relative to its parent and an edge's points relative to its container (the lowest common ancestor of its ends). This module offsets both back to absolute coordinates; `C4Diagram` and `semantic-flow.ts` convert child positions back to parent-relative for SvelteFlow.
