---
{
  "title": "WorkflowNode — Custom SvelteFlow Node Component",
  "summary": "A Svelte 5 component that renders a single node inside a SvelteFlow canvas, supporting six semantic node types with distinct colors and icons, five execution status states, and special two-handle branching for condition nodes.",
  "concepts": [
    "SvelteFlow",
    "custom node",
    "workflow",
    "condition node",
    "handles",
    "node types",
    "status indicator",
    "Svelte 5",
    "xyflow",
    "dark theme",
    "branching"
  ],
  "categories": [
    "widget",
    "workflow",
    "graph-ui"
  ],
  "source_docs": [
    "0a4ae08221c10600"
  ],
  "backlinks": null,
  "word_count": 467,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`WorkflowNode.svelte` is the visual building block for workflow diagrams built on top of the `@xyflow/svelte` library. SvelteFlow delegates all node rendering to user-supplied components; this component fulfils that contract for the Ripple workflow widget family.

## Node Types

Six node types are supported, each with a distinct color palette and icon:

```typescript
const TYPE_CONFIG = {
  trigger:   { color: '#0A84FF', icon: '⚡' },  // blue  — starts the flow
  action:    { color: '#34C759', icon: '▶' },   // green — executes a task
  condition: { color: '#FF9F0A', icon: '◆' },   // amber — branches the flow
  approval:  { color: '#FFD60A', icon: '✓' },   // yellow — human gate
  connector: { color: '#BF5AF2', icon: '⟷' },   // purple — integrations
  output:    { color: '#64D2FF', icon: '◎' },   // cyan  — terminal result
};
```

The color choices follow Apple Human Interface Guidelines hues (iOS system blue, green, orange, etc.) for immediate visual legibility on dark backgrounds.

## Status Indicators

A small dot in the top-right of the node reflects runtime execution state:

- `idle` — grey (not yet reached)
- `running` — amber (currently executing)
- `success` — green (completed cleanly)
- `error` — red (failed)
- `waiting` — purple (paused for external input)

This makes it possible to stream live workflow execution state from a host into the UI without re-mounting nodes.

## Handle Logic

SvelteFlow handles are the connection points between nodes. The component applies three rules:

1. **Trigger nodes** have no input handle — they always start a flow, never receive one.
2. **Output nodes** have no output handle — they terminate the flow.
3. **Condition nodes** get two named output handles (`yes` at 30% height, `no` at 70%) with color-coded labels. This is the core branching primitive — without split handles, condition logic cannot be expressed in the canvas.

All other nodes get one input (left) and one output (right) handle.

## Defensive Patterns

Every derived value falls back to a safe default:

```typescript
const nodeType = $derived((data.nodeType as string) ?? 'action');
const config   = $derived(TYPE_CONFIG[nodeType] ?? TYPE_CONFIG.action);
const status   = $derived((data.status as string) ?? 'idle');
```

This prevents render crashes when SvelteFlow passes incomplete or untyped node data during canvas initialization.

## Styling Approach

Handle elements are injected by `@xyflow/svelte` outside the component's Shadow DOM boundary, so they cannot be styled with scoped selectors. The component uses `:global(.wf-handle)` specifically to reach into xyflow's rendered DOM. Without the global override, handles would appear as the library defaults and clash with the dark-themed design.

## Known Gaps

The `id` prop is accepted but unused in the template — it may have been included to satisfy a future SvelteFlow constraint requiring node IDs in custom components. Icons from `data.icon` override the type default but there is no validation that the string is a renderable character.