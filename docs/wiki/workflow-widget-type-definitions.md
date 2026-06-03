---
{
  "title": "Workflow Widget Type Definitions",
  "summary": "TypeScript interfaces and union types that define the data contract for the workflow widget's nodes and edges, enabling type-safe pocket spec authoring and enforcing the six valid node types and five execution status states.",
  "concepts": [
    "TypeScript types",
    "WorkflowNodeData",
    "WorkflowEdgeData",
    "WorkflowNodeType",
    "WorkflowNodeStatus",
    "type union",
    "workflow spec",
    "edge types",
    "node data contract"
  ],
  "categories": [
    "types",
    "workflow",
    "data-model"
  ],
  "source_docs": [
    "e2f8b8254854e2d1"
  ],
  "backlinks": null,
  "word_count": 382,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/workflow/types.ts` is the single source of truth for the data shapes flowing through the workflow widget family. It exports four types:

```typescript
export type WorkflowNodeType   = 'trigger' | 'action' | 'condition' | 'approval' | 'connector' | 'output';
export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';

export interface WorkflowNodeData { ... }
export interface WorkflowEdgeData { ... }
```

## Node Type Union

`WorkflowNodeType` constrains the `type` field to six semantic categories, each with a corresponding visual treatment in `WorkflowNode.svelte`:

- **trigger** — entry point, no incoming handle
- **action** — general task execution
- **condition** — branching logic, two output handles
- **approval** — human-in-the-loop gate
- **connector** — third-party integration step
- **output** — terminal result, no outgoing handle

Using a union literal type rather than a plain string forces TypeScript to catch typos at compile time (`'conditoin'` becomes an error) and enables exhaustive switch analysis in render logic.

## Status Union

`WorkflowNodeStatus` models the lifecycle of a node during live execution:

- **idle** → not yet reached
- **running** → currently executing
- **success** → completed without error
- **error** → failed
- **waiting** → paused for external input (e.g. approval)

This is separate from `WorkflowNodeType` because status is dynamic and type-checked — a pocket can stream status updates without revalidating the static node structure.

## WorkflowNodeData Interface

```typescript
interface WorkflowNodeData {
  id: string;
  type: WorkflowNodeType;
  label: string;
  icon?: string;       // override the default type icon
  tool?: string;       // tool/integration identifier
  status?: WorkflowNodeStatus;
  position?: { x: number; y: number };
}
```

`position` is optional — when absent, `autoLayout` fills in coordinates automatically. `tool` is an extension point for labeling what integration backs an action or connector node.

## WorkflowEdgeData Interface

```typescript
interface WorkflowEdgeData {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}
```

Edges are minimal by design. `from`/`to` reference node IDs. `animated` enables SvelteFlow's dashed animated edge style, useful for highlighting active execution paths. `label` can annotate condition branches ("yes"/"no") from the spec rather than relying on handle position.

## Known Gaps

There is no `weight` or `priority` field on edges for weighted DAG scenarios. The `tool` field on nodes has no validated enum — any string is accepted, which means tooling and rendering code must handle arbitrary values defensively.