---
{
  "title": "C4 Diagram Widget — SvelteFlow + ELK Architecture Visualizer",
  "summary": "The top-level C4 Model diagram widget that uses SvelteFlow for rendering and ELK.js for automatic layout. It supports all four C4 levels (Context, Container, Component, Code) with drill-down navigation, pan/zoom, and a minimap.",
  "concepts": [
    "C4 model",
    "SvelteFlow",
    "ELK layout",
    "drill-down",
    "C4Diagram",
    "layoutReady",
    "cancellation",
    "race condition",
    "node types",
    "minimap",
    "pan/zoom",
    "architecture diagram",
    "Svelte 5 runes",
    "$effect"
  ],
  "categories": [
    "widget",
    "diagram",
    "layout"
  ],
  "source_docs": [
    "dca4824057c9d36d"
  ],
  "backlinks": null,
  "word_count": 503,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4Diagram.svelte` is the primary entry point for the C4 widget subsystem. It was rewritten from an SVG-based approach to SvelteFlow + ELK on 2026-04-07 to gain professional layout, interactive pan/zoom, group node nesting, and a minimap. A follow-up on 2026-04-10 added cancellation to the layout `$effect` to prevent stale results from concurrent renders.

## Props

| Prop | Type | Purpose |
|------|------|---------|
| `diagram` | `C4Diagram` | Full diagram data including level, elements, relationships |
| `class` | `string` | Extra CSS class for the root wrapper |
| `onclick` | `(elementId: string) => void` | Called when a non-drillable node is clicked |
| `ondrilldown` | `(elementId: string, level: string) => void` | Called when a drillable node is clicked to zoom in |

## Architecture

The component registers all seven C4 node types with SvelteFlow:

```typescript
const nodeTypes: NodeTypes = {
  person: C4PersonNode as any,
  system: C4SystemNode as any,
  container: C4ContainerNode as any,
  database: C4DatabaseNode as any,
  queue: C4QueueNode as any,
  component: C4ComponentNode as any,
  group: C4GroupNode as any,
};
```

Layout state is held in reactive `$state` variables (`flowNodes`, `flowEdges`, `layoutReady`, `layoutError`) rather than `$derived`, because ELK layout is async — it cannot complete inside a synchronous derived computation.

## Layout Lifecycle

A `$effect` watches the `diagram` prop and calls `computeElkLayout`. The critical addition from 2026-04-10 is a **cancellation flag**: if the `diagram` prop changes before a previous ELK call resolves, the stale result is discarded. Without this, a slow layout computation started with diagram A could overwrite the results for diagram B if diagram B's layout finished first — a classic async race condition in reactive systems.

```
diagram changes
  → cancel any pending layout
  → set layoutReady = false
  → call computeElkLayout(diagram)
  → on resolve: set flowNodes, flowEdges, layoutReady = true
  → on reject: set layoutError
```

## C4 Level Support

The component supports all four C4 levels, displayed via a level badge:

| `diagram.level` | Badge label |
|-----------------|-------------|
| `context` | System Context |
| `container` | Container |
| `component` | Component |
| `code` | Code |

Drill-down is triggered by clicking nodes with `drillable: true` in their data. The `ondrilldown` callback receives the element ID and the next level, allowing the parent to swap in a new `diagram` prop for the deeper view.

## Minimap Color Coding

A `NODE_TYPE_COLORS` map provides distinct minimap colors per node type, making it easy to spot system boundaries vs. databases vs. queues at a glance:

- `person` → blue (`#0A84FF`)
- `system` → medium blue (`#2563EB`)
- `database` → purple (`#7C3AED`)
- `queue` → amber (`#F59E0B`)
- `group` → translucent blue

## Known Gaps

- The `as any` casts on node type registrations are Svelte 5 compatibility shims — SvelteFlow has not yet updated its TypeScript signatures for Svelte 5 component types.
- Error state (`layoutError`) is captured but the source does not show a visible error UI fallback — consumers should handle this prop or check whether an error boundary is applied upstream.