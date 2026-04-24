---
{
  "title": "C4 System Node — Top-Level Architecture Block with Drill-Down",
  "summary": "A SvelteFlow custom node that renders a C4 System element as a rounded rectangle, with blue styling for internal systems and gray dashed borders for external ones. Supports multi-level drill-down from Context through Component, and carries reactive style bindings for all color properties.",
  "concepts": [
    "C4SystemNode",
    "external system",
    "internal system",
    "drill-down",
    "SvelteFlow custom node",
    "reactive styles",
    "diagramLevel",
    "C4NodeData",
    "Handle",
    "dashed border",
    "context diagram",
    "isExternal"
  ],
  "categories": [
    "widget",
    "diagram",
    "navigation"
  ],
  "source_docs": [
    "07cf4f2ef4bc430d"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4SystemNode.svelte` renders top-level software systems in C4 diagrams — the boxes at the center of Context-level diagrams and the boundary elements in Container-level diagrams. It is registered as the `'system'` node type and handles external/internal visual differentiation as well as progressive drill-down.

## Reactive Color System

All four visual colors are derived reactively from the `isExternal` flag:

```typescript
const bgColor = $derived(isExternal ? 'rgba(107,114,128,0.12)' : 'rgba(37,99,235,0.15)');
const borderColor = $derived(isExternal ? 'rgba(107,114,128,0.35)' : 'rgba(37,99,235,0.45)');
const accentColor = $derived(isExternal ? '#6B7280' : '#2563EB');
const textColor = $derived(isExternal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.88)');
```

External systems are visually de-emphasized (low opacity gray) to signal they are outside the team's control boundary. The border style also toggles: `dashed` for external, `solid` for internal — matching the C4 notation standard.

## Multi-Level Drill-Down

The click handler implements the full C4 level progression:

```typescript
const nextLevel =
  data.diagramLevel === 'context'   ? 'container'
  : data.diagramLevel === 'container' ? 'component'
  : 'code';
data.ondrilldown(data.element, nextLevel);
```

This logic allows `C4SystemNode` to appear at multiple diagram levels. At context level, it drills to containers. At container level (when a system appears as an external reference), it drills to components. The node carries its current level in `data.diagramLevel`, set by `C4Diagram.svelte` when building the node data.

If `hasDrilldown` is false (or `ondrilldown` is absent), the click falls through to a plain `data.onclick` for informational selection without navigation.

## Visual Content

- **Type label**: "Software System" or "External System" using `accentColor`
- **Name**: primary label with `textColor`
- **Description**: truncated at 60 characters
- **Drill indicator**: visible when `hasDrilldown` is true

## Connection Handles

All four handle positions are present. In Context diagrams, system nodes connect to person nodes (left/right edges) and to other systems (top/bottom edges). ELK selects actual routing, so all sides must be available.

## Relationship to Group Nodes

`C4SystemNode` is used for **flat systems** (no containers), while `C4GroupNode` is used for systems that have child containers. The decision is made by `getNodeType()` in `elk-layout.ts`. Both node types share the same blue/gray color vocabulary, but `C4GroupNode` renders as a transparent boundary box while `C4SystemNode` renders as a solid card.

## Known Gaps

- The drill-down level progression falls back to `'code'` for any level that isn't `'context'` or `'container'`. If `data.diagramLevel` is ever `undefined`, the next level will silently be `'code'` rather than raising an error.