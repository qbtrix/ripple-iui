<!--
  Workflow.svelte — Workflow widget for Ripple generative UI.
  Renders interactive node-based workflow diagrams using @xyflow/svelte.
  Accepts WorkflowNode[] and WorkflowEdge[] in a simplified spec format,
  maps them to SvelteFlow's Node/Edge types, and provides auto-layout
  when positions are not explicitly set.
-->
<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap, Position } from '@xyflow/svelte';
  import type { Node, Edge, NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  import { WorkflowNode } from './workflow/index.js';
  import { autoLayout } from './workflow/layout.js';
  import type { WorkflowNodeData, WorkflowEdgeData } from './workflow/types.js';
  import { asText } from '$lib/widgets/text-coerce';

  interface Props {
    nodes?: WorkflowNodeData[];
    edges?: WorkflowEdgeData[];
    title?: string;
    interactive?: boolean;
    minimap?: boolean;
    fitView?: boolean;
    class?: string;
  }

  let {
    nodes: inputNodes = [],
    edges: inputEdges = [],
    title = '',
    interactive = true,
    minimap = false,
    fitView = true,
    class: className = '',
  }: Props = $props();

  // Register the custom node type
  const nodeTypes: NodeTypes = {
    workflowNode: WorkflowNode as any,
  };

  // Map input nodes to SvelteFlow nodes
  const flowNodes = $derived.by((): Node[] => {
    // Compute auto-layout for nodes missing positions
    const needsLayout = inputNodes.some((n) => !n.position);
    const layoutPositions = needsLayout ? autoLayout(inputNodes, inputEdges) : new Map();

    return inputNodes.map((n) => {
      const pos = n.position ?? layoutPositions.get(n.id) ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: 'workflowNode',
        position: pos,
        data: {
          nodeType: n.type,
          label: n.label,
          icon: n.icon ?? '',
          tool: n.tool ?? '',
          status: n.status ?? 'idle',
        },
        // Condition nodes need specific source/target positions for handles
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: interactive,
        selectable: interactive,
      } satisfies Node;
    });
  });

  // Map input edges to SvelteFlow edges
  const flowEdges = $derived.by((): Edge[] => {
    return inputEdges.map((e, i) => {
      const edge: Edge = {
        id: `e-${e.from}-${e.to}-${i}`,
        source: e.from,
        target: e.to,
        label: e.label,
        animated: e.animated ?? false,
        type: 'smoothstep',
        style: 'stroke: rgba(255,255,255,0.20); stroke-width: 1.5px;',
        labelStyle: 'fill: rgba(255,255,255,0.65); font-size: 10px; font-weight: 500;',
      };

      // If the source is a condition node, connect from the appropriate handle
      const sourceNode = inputNodes.find((n) => n.id === e.from);
      if (sourceNode?.type === 'condition' && e.label) {
        // Edge labels come from spec data and can be non-strings — coerce
        // before .toLowerCase so the handle match never crashes the canvas.
        const handleId = asText(e.label).toLowerCase();
        if (handleId === 'yes' || handleId === 'no') {
          edge.sourceHandle = handleId;
        }
      }

      return edge;
    });
  });
</script>

<div class="workflow-widget {className}">
  {#if title}
    <div class="workflow-title">{title}</div>
  {/if}
  <div class="workflow-canvas">
    <SvelteFlow
      nodes={flowNodes}
      edges={flowEdges}
      {nodeTypes}
      {fitView}
      fitViewOptions={{ padding: 0.3 }}
      colorMode="dark"
      panOnDrag={interactive}
      zoomOnScroll={interactive}
      zoomOnPinch={interactive}
      zoomOnDoubleClick={interactive}
      nodesDraggable={interactive}
      nodesConnectable={false}
      elementsSelectable={interactive}
      minZoom={0.2}
      maxZoom={3}
      defaultMarkerColor="rgba(255,255,255,0.3)"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        gap={20}
        patternColor="rgba(255,255,255,0.05)"
      />
      <Controls
        showLock={false}
        position="bottom-right"
      />
      {#if minimap}
        <MiniMap
          position="bottom-left"
          maskColor="rgba(0,0,0,0.6)"
          bgColor="rgba(255,255,255,0.03)"
          nodeColor={(node) => {
            const TYPE_COLORS: Record<string, string> = {
              trigger:   '#0A84FF',
              action:    '#34C759',
              condition: '#FF9F0A',
              approval:  '#FFD60A',
              connector: '#BF5AF2',
              output:    '#64D2FF',
            };
            return TYPE_COLORS[(node.data as Record<string, unknown>)?.nodeType as string] ?? '#666';
          }}
        />
      {/if}
    </SvelteFlow>
  </div>
</div>

<style>
  .workflow-widget {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .workflow-title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    padding: 0 0 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .workflow-canvas {
    width: 100%;
    height: 400px;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  /* Dark theme overrides for SvelteFlow */
  .workflow-canvas :global(.svelte-flow) {
    background: transparent !important;
  }

  .workflow-canvas :global(.svelte-flow__background) {
    background: transparent !important;
  }

  .workflow-canvas :global(.svelte-flow__edge-path) {
    stroke: rgba(255, 255, 255, 0.20);
  }

  .workflow-canvas :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    stroke-dasharray: 5;
    animation: wf-dash 0.5s linear infinite;
  }

  .workflow-canvas :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke: rgba(10, 132, 255, 0.6);
    stroke-width: 2px;
  }

  .workflow-canvas :global(.svelte-flow__selection) {
    background: rgba(10, 132, 255, 0.08) !important;
    border: 1px solid rgba(10, 132, 255, 0.30) !important;
  }

  .workflow-canvas :global(.svelte-flow__controls) {
    background: rgba(30, 30, 30, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  }

  .workflow-canvas :global(.svelte-flow__controls-button) {
    background: transparent !important;
    border: none !important;
    color: rgba(255, 255, 255, 0.65) !important;
    fill: rgba(255, 255, 255, 0.65) !important;
  }

  .workflow-canvas :global(.svelte-flow__controls-button:hover) {
    background: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    fill: rgba(255, 255, 255, 0.9) !important;
  }

  .workflow-canvas :global(.svelte-flow__controls-button svg) {
    fill: inherit !important;
  }

  .workflow-canvas :global(.svelte-flow__minimap) {
    background: rgba(20, 20, 20, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
  }

  .workflow-canvas :global(.svelte-flow__minimap-mask) {
    fill: rgba(0, 0, 0, 0.6) !important;
  }

  .workflow-canvas :global(.svelte-flow__node) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .workflow-canvas :global(.svelte-flow__node.selected) {
    box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.5) !important;
    border-radius: 10px !important;
  }

  .workflow-canvas :global(.svelte-flow__edge-text) {
    fill: rgba(255, 255, 255, 0.65);
    font-size: 10px;
  }

  .workflow-canvas :global(.svelte-flow__edge-textbg) {
    fill: rgba(20, 20, 20, 0.85);
  }

  @keyframes wf-dash {
    to {
      stroke-dashoffset: -10;
    }
  }
</style>
