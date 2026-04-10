<!--
  C4Diagram.svelte — SvelteFlow + ELK.js based C4 Model diagram widget.
  Modified: 2026-04-07 — Complete rewrite from SVG-based to SvelteFlow/ELK for
  professional-grade layout, interactive pan/zoom, minimap, and group node nesting.
  Supports all 4 C4 levels (Context, Container, Component, Code) with drill-down.
  Modified: 2026-04-10 — Add cancellation to $effect layout call to prevent stale results from race conditions.
-->
<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap, Position } from '@xyflow/svelte';
  import type { Node, Edge, NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  import {
    C4PersonNode,
    C4SystemNode,
    C4ContainerNode,
    C4DatabaseNode,
    C4QueueNode,
    C4ComponentNode,
    C4GroupNode,
  } from './nodes/index.js';
  import { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
  import type { C4Diagram, C4Element, C4System, C4Container, C4Component, C4NodeData } from './types.js';

  interface Props {
    diagram: C4Diagram;
    class?: string;
    onclick?: (elementId: string) => void;
    ondrilldown?: (elementId: string, level: string) => void;
  }

  let {
    diagram,
    class: className = '',
    onclick,
    ondrilldown,
  }: Props = $props();

  // Register all C4 node types for SvelteFlow
  const nodeTypes: NodeTypes = {
    person: C4PersonNode as any,
    system: C4SystemNode as any,
    container: C4ContainerNode as any,
    database: C4DatabaseNode as any,
    queue: C4QueueNode as any,
    component: C4ComponentNode as any,
    group: C4GroupNode as any,
  };

  // Level badge labels
  const levelLabels: Record<string, string> = {
    context: 'System Context',
    container: 'Container',
    component: 'Component',
    code: 'Code',
  };

  // C4 color palette for the minimap node coloring
  const NODE_TYPE_COLORS: Record<string, string> = {
    person: '#0A84FF',
    system: '#2563EB',
    container: '#1D4ED8',
    database: '#7C3AED',
    queue: '#F59E0B',
    component: '#3B82F6',
    group: 'rgba(37,99,235,0.3)',
  };

  // ---- ELK layout state ----
  let flowNodes = $state<Node[]>([]);
  let flowEdges = $state<Edge[]>([]);
  let layoutReady = $state(false);
  let layoutError = $state<string | null>(null);

  // Helpers for classifying C4 elements
  function isDatabase(el: C4Element): boolean {
    return 'type' in el && (el as { type?: string }).type === 'database';
  }

  function isQueue(el: C4Element): boolean {
    return 'type' in el && (el as { type?: string }).type === 'queue';
  }

  function hasDrillDown(el: C4Element): boolean {
    return (
      ('containers' in el && Array.isArray((el as C4System).containers) && ((el as C4System).containers?.length ?? 0) > 0) ||
      ('components' in el && Array.isArray((el as C4Container).components) && ((el as C4Container).components?.length ?? 0) > 0)
    );
  }

  function getSubtype(el: C4Element): string | undefined {
    if ('type' in el) return (el as { type?: string }).type;
    return undefined;
  }

  /**
   * Build the full flat list of C4 elements to layout, including nested
   * containers/components that live inside parent system nodes.
   */
  function collectAllElements(diagram: C4Diagram): C4Element[] {
    const all: C4Element[] = [];
    for (const el of diagram.elements) {
      all.push(el);
      // For context views, also add containers as children of systems
      // so they appear in the group node layout
      if ('containers' in el && Array.isArray((el as C4System).containers)) {
        for (const c of (el as C4System).containers ?? []) {
          all.push(c as C4Element);
          if ('components' in c && Array.isArray(c.components)) {
            for (const comp of c.components ?? []) {
              all.push(comp as C4Element);
            }
          }
        }
      }
      if ('components' in el && Array.isArray((el as C4Container).components)) {
        for (const comp of (el as C4Container).components ?? []) {
          all.push(comp as C4Element);
        }
      }
    }
    return all;
  }

  /**
   * Convert the C4 diagram to SvelteFlow Node[] using ELK-computed positions.
   */
  async function buildFlowGraph(diagram: C4Diagram): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const positions = await computeElkLayout(diagram);

    // Gather all elements (top-level and nested children for group nodes)
    const allElements = collectAllElements(diagram);
    const elementMap = new Map<string, C4Element>(allElements.map((e) => [e.id, e]));

    // Build parent→children mapping for SvelteFlow node nesting
    const parentOf = new Map<string, string>();
    for (const el of diagram.elements) {
      if ('containers' in el && Array.isArray((el as C4System).containers)) {
        for (const c of (el as C4System).containers ?? []) {
          parentOf.set(c.id, el.id);
          if ('components' in c && Array.isArray(c.components)) {
            for (const comp of c.components ?? []) {
              parentOf.set(comp.id, c.id);
            }
          }
        }
      }
      if ('components' in el && Array.isArray((el as C4Container).components)) {
        for (const comp of (el as C4Container).components ?? []) {
          parentOf.set(comp.id, el.id);
        }
      }
    }

    const nodes: Node[] = [];

    for (const el of allElements) {
      const pos = positions.get(el.id);
      if (!pos) continue;

      const nodeType = getNodeType(el);
      const isGroup = isGroupNode(el);
      const parentId = parentOf.get(el.id);

      // Build the node data payload
      const nodeData: C4NodeData = {
        name: el.name,
        description: el.description,
        technology: 'technology' in el ? (el as { technology?: string }).technology : undefined,
        external: 'external' in el ? (el as { external?: boolean }).external : false,
        subtype: getSubtype(el),
        drillable: hasDrillDown(el),
        kb_article: 'kb_article' in el ? (el as { kb_article?: string }).kb_article : undefined,
        tags: 'tags' in el ? (el as { tags?: string[] }).tags : undefined,
        element: el,
        diagramLevel: diagram.level,
        onclick: onclick ? (element: C4Element) => onclick(element.id) : undefined,
        ondrilldown: ondrilldown
          ? (element: C4Element, level: string) => ondrilldown(element.id, level)
          : undefined,
      };

      // Compute position — SvelteFlow child node positions are relative to parent
      let nodeX = pos.x;
      let nodeY = pos.y;

      if (parentId) {
        const parentPos = positions.get(parentId);
        if (parentPos) {
          nodeX = pos.x - parentPos.x;
          nodeY = pos.y - parentPos.y;
        }
      }

      const node: Node = {
        id: el.id,
        type: nodeType,
        position: { x: nodeX, y: nodeY },
        data: nodeData as unknown as Record<string, unknown>,
        draggable: false,
        selectable: true,
        // Group nodes need explicit dimensions for SvelteFlow to render the bounding box
        ...(isGroup ? { style: `width: ${pos.width}px; height: ${pos.height}px;` } : {}),
        ...(parentId ? { parentId } : {}),
        // Group nodes must not be draggable out of the layout
        ...(isGroup ? { draggable: false } : {}),
      };

      nodes.push(node);
    }

    // Build edges from relationships
    const allElementIds = new Set(allElements.map((e) => e.id));
    const edges: Edge[] = diagram.relationships
      .filter((r) => allElementIds.has(r.from) && allElementIds.has(r.to))
      .map((r, i) => {
        const isAsync = r.style === 'async';
        const isEvent = r.style === 'event';

        const edgeStyle = isEvent
          ? 'stroke: rgba(245,158,11,0.55); stroke-width: 1.5px; stroke-dasharray: 4 4;'
          : isAsync
            ? 'stroke: rgba(255,255,255,0.2); stroke-width: 1.5px; stroke-dasharray: 8 4;'
            : 'stroke: rgba(255,255,255,0.2); stroke-width: 1.5px;';

        const labelParts: string[] = [];
        if (r.label) labelParts.push(r.label);
        if (r.technology) labelParts.push(`[${r.technology}]`);

        return {
          id: `edge-${i}-${r.from}-${r.to}`,
          source: r.from,
          target: r.to,
          type: 'smoothstep',
          label: labelParts.join(' ') || undefined,
          animated: isAsync,
          style: edgeStyle,
          labelStyle: 'fill: rgba(255,255,255,0.55); font-size: 9px; font-weight: 500;',
        } satisfies Edge;
      });

    return { nodes, edges };
  }

  // Run ELK layout whenever the diagram input changes
  $effect(() => {
    const currentDiagram = diagram;
    let cancelled = false;
    layoutReady = false;
    layoutError = null;

    buildFlowGraph(currentDiagram)
      .then(({ nodes, edges }) => {
        if (cancelled) return;
        flowNodes = nodes;
        flowEdges = edges;
        layoutReady = true;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[C4Diagram] Layout failed:', err);
        layoutError = 'Diagram layout failed. Please check your data.';
        layoutReady = true; // Show error state
      });

    return () => { cancelled = true; };
  });
</script>

<div class="c4-diagram {className}" role="figure" aria-label={diagram.title}>
  <!-- Header -->
  <div class="c4-header">
    <div class="c4-title-row">
      <h3 class="c4-title">{diagram.title}</h3>
      <span class="c4-level-badge">{levelLabels[diagram.level] ?? diagram.level}</span>
    </div>
    {#if diagram.description}
      <p class="c4-description">{diagram.description}</p>
    {/if}
  </div>

  <!-- Flow canvas -->
  <div class="c4-canvas">
    {#if !layoutReady}
      <!-- Loading state -->
      <div class="c4-loading" aria-live="polite">
        <span class="c4-spinner" aria-hidden="true"></span>
        <span>Computing layout&hellip;</span>
      </div>
    {:else if layoutError}
      <!-- Error state -->
      <div class="c4-error" role="alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{layoutError}</span>
      </div>
    {:else}
      <SvelteFlow
        nodes={flowNodes}
        edges={flowEdges}
        {nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        colorMode="dark"
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.15}
        maxZoom={4}
        defaultMarkerColor="rgba(255,255,255,0.25)"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={24}
        />
        <Controls
          showLock={false}
          position="bottom-right"
        />
        <MiniMap
          position="bottom-left"
          maskColor="rgba(0,0,0,0.6)"
          bgColor="rgba(255,255,255,0.02)"
          nodeColor={(node) => {
            return NODE_TYPE_COLORS[(node.type as string) ?? 'system'] ?? '#3B82F6';
          }}
        />
      </SvelteFlow>
    {/if}
  </div>

  <!-- Legend -->
  {#if layoutReady && !layoutError}
    <div class="c4-legend" role="list" aria-label="Diagram legend">
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: #0A84FF; border-radius: 50%;"></span>
        <span>Person</span>
      </div>
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: #2563EB;"></span>
        <span>System</span>
      </div>
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: #1D4ED8;"></span>
        <span>Container</span>
      </div>
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: #7C3AED;"></span>
        <span>Database</span>
      </div>
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: #F59E0B;"></span>
        <span>Queue</span>
      </div>
      <div class="c4-legend-item" role="listitem">
        <span class="c4-legend-swatch" style="background: rgba(107,114,128,0.5); border: 1px dashed rgba(107,114,128,0.7);"></span>
        <span>External</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .c4-diagram {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ---- Header ---- */
  .c4-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .c4-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .c4-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .c4-level-badge {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(37, 99, 235, 0.5);
    padding: 2px 8px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .c4-description {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
  }

  /* ---- Canvas ---- */
  .c4-canvas {
    width: 100%;
    height: 480px;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(10, 15, 30, 0.6);
  }

  /* ---- Loading / Error states ---- */
  .c4-loading,
  .c4-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
  }

  .c4-error {
    color: rgba(239, 68, 68, 0.75);
  }

  .c4-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: rgba(59, 130, 246, 0.7);
    border-radius: 50%;
    animation: c4-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes c4-spin {
    to { transform: rotate(360deg); }
  }

  /* ---- Legend ---- */
  .c4-legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    padding: 2px 0;
  }

  .c4-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
  }

  .c4-legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* ---- SvelteFlow dark theme overrides ---- */
  .c4-canvas :global(.svelte-flow) {
    background: transparent !important;
  }

  .c4-canvas :global(.svelte-flow__background) {
    background: transparent !important;
  }

  .c4-canvas :global(.svelte-flow__node) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .c4-canvas :global(.svelte-flow__node.selected) {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.55) !important;
    border-radius: 10px !important;
  }

  .c4-canvas :global(.svelte-flow__edge-path) {
    stroke: rgba(255, 255, 255, 0.2);
  }

  .c4-canvas :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    stroke-dasharray: 8 4;
    animation: c4-dash 0.8s linear infinite;
  }

  .c4-canvas :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke: rgba(59, 130, 246, 0.7);
    stroke-width: 2px;
  }

  .c4-canvas :global(.svelte-flow__edge-text) {
    fill: rgba(255, 255, 255, 0.6);
    font-size: 9px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .c4-canvas :global(.svelte-flow__edge-textbg) {
    fill: rgba(10, 15, 30, 0.85);
  }

  .c4-canvas :global(.svelte-flow__controls) {
    background: rgba(20, 25, 40, 0.88) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35) !important;
  }

  .c4-canvas :global(.svelte-flow__controls-button) {
    background: transparent !important;
    border: none !important;
    color: rgba(255, 255, 255, 0.6) !important;
    fill: rgba(255, 255, 255, 0.6) !important;
  }

  .c4-canvas :global(.svelte-flow__controls-button:hover) {
    background: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    fill: rgba(255, 255, 255, 0.9) !important;
  }

  .c4-canvas :global(.svelte-flow__controls-button svg) {
    fill: inherit !important;
  }

  .c4-canvas :global(.svelte-flow__minimap) {
    background: rgba(15, 20, 35, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.07) !important;
    border-radius: 8px !important;
  }

  .c4-canvas :global(.svelte-flow__minimap-mask) {
    fill: rgba(0, 0, 0, 0.55) !important;
  }

  /* Group node bounding box sizing — SvelteFlow requires explicit width/height on parent nodes */
  .c4-canvas :global(.svelte-flow__node-group) {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
  }

  @keyframes c4-dash {
    to { stroke-dashoffset: -12; }
  }
</style>
