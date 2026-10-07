<!--
  C4Diagram.svelte — SvelteFlow + ELK.js C4 model diagram: all four levels
  (Context, Container, Component, Code), pan/zoom, minimap, nested boundaries
  and drill-down through `ondrilldown`.

  Live layer (all optional; absent, the widget behaves as it always did):
  `status` paints a node's state through a `data-c4-status` attribute on its
  SvelteFlow wrapper (ring colours are ripple tokens; only `changing` moves;
  `planned` draws a blueprint: dashed outline, no fill, content dimmed;
  written straight to the wrappers, since a new nodes array makes SvelteFlow
  re-lay every edge),
  `markers` pins dots to nodes, `selectedId` controls selection, and
  `focusId` + `follow` keep the camera on one node. A user pan or zoom (the
  zoom buttons and the minimap included) calls `onmanualcamera`, so a host can
  drop follow mode. Enter or Space on a focused node runs exactly what a click
  on it runs (activate.ts), for every node type.

  Edges follow ELK's orthogonal routes (C4Edge) and every card fills its ELK
  box, so routes meet card edges and labels sit in the space ELK reserved.

  SvelteFlow stays mounted across diagram swaps: only the first layout shows
  the loading state, and C4LiveLayer refits when the node set changes. The
  layout spinner stops under prefers-reduced-motion.

  Semantic zoom (pass `expanded`): one canvas for the whole tree. An expanded
  element opens in place as a boundary around its children (an expanded code
  element with an excerpt opens as a code panel), `scopeId` ghosts what lies
  outside it, edges lift onto drawn siblings with port badges and counts, and
  markers on hidden elements roll up to their drawn ancestor (semantic.ts,
  semantic-flow.ts). Between layouts nodes glide and resize with the ripple
  ease, leaving nodes fade where they were (and stay, hidden, until the next
  layout replaces them: removing them alone is another whole-map pass), edges
  and markers sit out the move,
  and the camera eases to the new frame; all instant under reduced motion.
  Without `expanded` none of this runs and the widget renders as before.
-->
<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap } from '@xyflow/svelte';
  import type { Node, Edge, NodeTypes, EdgeTypes } from '@xyflow/svelte';
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
  import C4LiveLayer from './C4LiveLayer.svelte';
  import C4Edge from './C4Edge.svelte';
  import { C4CodeNode } from './nodes/index.js';
  import { untrack } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { computeElkGraph, edgeLabelText, getNodeType, isGroupNode, type LayoutPosition } from './elk-layout.js';
  import {
    decorateNodes,
    markResized,
    nodeSetKey,
    statusesPresent,
    unionRect,
    STATUS_LABELS,
    EDGE_STROKE,
    edgeLook,
  } from './live.js';
  import { liftMarkers, representative, type C4Tree, type Visibility } from './semantic.js';
  import { buildSemanticFlow } from './semantic-flow.js';
  import { activateNode } from './activate.js';
  // From types.ts, NOT the barrel, and aliased: this component is itself named
  // C4Diagram, and svelte-package emits `declare const C4Diagram` plus
  // `type C4Diagram` in the .d.ts. An unaliased type import of the same name
  // collided with both, so consumers saw the component as type-only.
  import type {
    C4Diagram as C4DiagramData,
    C4Element,
    C4System,
    C4Container,
    C4NodeData,
    C4Status,
    C4Marker,
  } from './types.js';

  interface Props {
    diagram: C4DiagramData;
    class?: string;
    onclick?: (elementId: string) => void;
    ondrilldown?: (elementId: string, level: string) => void;
    /** Live state per element id. */
    status?: Record<string, C4Status>;
    /** Dots per element id (who is working there). */
    markers?: Record<string, C4Marker[]>;
    /** The element the camera frames while `follow` is true. */
    focusId?: string;
    follow?: boolean;
    /** Controlled selection; leave undefined to let clicks select. */
    selectedId?: string;
    /** A user pan, zoom or zoom-button press moved the camera. */
    onmanualcamera?: () => void;
    /** Semantic zoom: ids drawn open on one canvas. Passing it (even []) turns the mode on. */
    expanded?: string[];
    /** Semantic zoom: the element being looked inside; everything outside it is ghosted. */
    scopeId?: string;
  }

  let {
    diagram,
    class: className = '',
    onclick,
    ondrilldown,
    status,
    markers,
    focusId,
    follow,
    selectedId,
    onmanualcamera,
    expanded,
    scopeId,
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
    code: C4CodeNode as any,
  };

  const edgeTypes: EdgeTypes = { c4: C4Edge as any };

  // Level badge labels
  const levelLabels: Record<string, string> = {
    context: 'System Context',
    container: 'Container',
    component: 'Component',
    code: 'Code',
  };

  // Ripple tokens, so the canvas follows the host theme. Edges and the minimap
  // take colours as strings, which is why these are constants, not CSS.
  const MINIMAP_NODE = 'color-mix(in oklab, var(--ripple-muted-foreground) 45%, transparent)';
  const MINIMAP_GROUP = 'color-mix(in oklab, var(--ripple-muted-foreground) 10%, transparent)';

  const SHAPE_LEGEND = [
    { shape: 'person', label: 'Person' },
    { shape: 'system', label: 'System' },
    { shape: 'container', label: 'Container' },
    { shape: 'database', label: 'Database' },
    { shape: 'queue', label: 'Queue' },
    { shape: 'external', label: 'External' },
  ];

  // ---- ELK layout state ----
  let flowNodes = $state.raw<Node[]>([]);
  let flowEdges = $state.raw<Edge[]>([]);
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
    if (el.drillable !== undefined) return el.drillable;
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
  function collectAllElements(diagram: C4DiagramData): C4Element[] {
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
  async function buildFlowGraph(diagram: C4DiagramData): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const { positions, routes } = await computeElkGraph(diagram);

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
        kind: el.kind,
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
        // Every node takes its ELK box, so ELK's edge routes meet the card edges.
        width: pos.width,
        height: pos.height,
        // Group nodes need explicit dimensions for SvelteFlow to render the bounding box
        ...(isGroup ? { style: `width: ${pos.width}px; height: ${pos.height}px;` } : {}),
        ...(parentId ? { parentId } : {}),
        // Group nodes must not be draggable out of the layout
        ...(isGroup ? { draggable: false } : {}),
      };

      nodes.push(node);
    }

    // Build edges from relationships. An edge ELK routed draws its route (C4Edge);
    // without one (ELK fell back to a grid) it stays a smoothstep.
    const allElementIds = new Set(allElements.map((e) => e.id));
    const edges: Edge[] = [];
    diagram.relationships.forEach((r, i) => {
      if (!allElementIds.has(r.from) || !allElementIds.has(r.to)) return;
      const look = edgeLook(r.style);

      const route = routes.get(i);
      edges.push({
        id: `edge-${i}-${r.from}-${r.to}`,
        source: r.from,
        target: r.to,
        type: route ? 'c4' : 'smoothstep',
        label: edgeLabelText(r) || undefined,
        animated: look.animated,
        style: look.style,
        ...(route ? { data: { points: route.points, labelBox: route.label } } : {}),
      });
    });

    return { nodes, edges };
  }

  // True once a layout has landed. Plain (not $state): only the effect reads it.
  let hasLayout = false;

  // ---- Semantic zoom state ----
  /** The last semantic layout: what is drawn, and every element's absolute box. */
  let semanticInfo = $state.raw<{ tree: C4Tree; vis: Visibility; rects: Map<string, LayoutPosition> } | null>(null);
  /** Nodes that just left the map, fading where they were until the move settles. */
  let leaving = $state.raw<Node[]>([]);
  /** True while nodes glide between layouts: edges and markers sit it out. */
  let moving = $state(false);
  /** True while a layout is computing: the camera holds until it lands, so it moves once. */
  let laying = $state(false);
  const MOVE_MS = 560;
  /** Alternates the resize animation's name, so each move restarts it (markResized). */
  let resizeTurn: 'a' | 'b' = 'a';
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  // Keyed on strings: a host deriving `expanded` per frame must not re-run ELK per frame.
  const expandedKey = $derived(expanded === undefined ? null : expanded.join('\n'));

  function beginMove(prev: Node[], next: Node[], prevRects: Map<string, LayoutPosition> | undefined) {
    clearTimeout(settleTimer);
    if (prev.length === 0 || prefersReducedMotion.current) {
      leaving = [];
      moving = false;
      return;
    }
    const nextIds = new Set(next.map((n) => n.id));
    leaving = prev.flatMap((n) => {
      const r = prevRects?.get(n.id);
      if (nextIds.has(n.id) || !r) return [];
      // Absolute and unparented: its parent may be gone or shrinking.
      return [{ ...n, parentId: undefined, position: { x: r.x, y: r.y }, class: 'c4-leaving', selectable: false, focusable: false, zIndex: 1000, domAttributes: { 'aria-hidden': 'true' } }];
    });
    moving = true;
    settleTimer = setTimeout(() => {
      moving = false;
    }, MOVE_MS + 60);
  }

  // Run ELK layout whenever the diagram (or, in semantic zoom, the expanded set
  // or scope) changes. After the first layout the previous graph stays on
  // screen until the next one is ready.
  $effect(() => {
    const currentDiagram = diagram;
    const ek = expandedKey;
    const scope = ek === null ? undefined : scopeId;
    let cancelled = false;
    if (!hasLayout) layoutReady = false;
    layoutError = null;
    laying = true;

    // Handlers read the props when called, so the layout never tracks their identity. Without a
    // host ondrilldown a drillable card clicks instead, as in the non-semantic path.
    const handlers = {
      onclick: (id: string) => onclick?.(id),
      ondrilldown: untrack(() => ondrilldown) ? (id: string, level: string) => ondrilldown?.(id, level) : undefined,
    };
    const job =
      ek === null
        ? buildFlowGraph(currentDiagram).then((g) => ({ ...g, semantic: null }))
        : buildSemanticFlow(currentDiagram, new Set(ek ? ek.split('\n') : []), scope, handlers).then((f) => ({
            nodes: f.nodes,
            edges: f.edges,
            semantic: { tree: f.tree, vis: f.vis, rects: f.rects },
          }));

    job
      .then(({ nodes, edges, semantic }) => {
        if (cancelled) return;
        if (semantic) {
          const prevRects = semanticInfo?.rects;
          if (prevRects && flowNodes.length > 0 && !prefersReducedMotion.current) {
            resizeTurn = resizeTurn === 'a' ? 'b' : 'a';
            nodes = markResized(nodes, prevRects, semantic.rects, resizeTurn);
          }
          beginMove(flowNodes, nodes, prevRects);
        } else leaving = [];
        flowNodes = nodes;
        flowEdges = edges;
        semanticInfo = semantic;
        layoutReady = true;
        hasLayout = true;
        laying = false;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[C4Diagram] Layout failed:', err);
        layoutError = 'Diagram layout failed. Please check your data.';
        layoutReady = true; // Show error state
        laying = false;
      });

    return () => { cancelled = true; };
  });

  // ---- Live layer ----
  const shownNodes = $derived(
    decorateNodes(leaving.length ? [...flowNodes, ...leaving] : flowNodes, { selectedId })
  );
  // Live status as a data attribute on each node wrapper, written to the DOM: a status change
  // must not hand SvelteFlow a new nodes array (it re-lays every edge). Re-run when nodes mount.
  let canvas = $state<HTMLElement>();
  $effect(() => {
    const st = status ?? {};
    void shownNodes;
    if (!canvas) return;
    for (const el of canvas.querySelectorAll<HTMLElement>('.svelte-flow__node')) {
      const s = el.dataset.id ? st[el.dataset.id] : undefined;
      if (s) {
        if (el.dataset.c4Status !== s) el.dataset.c4Status = s;
      } else if (el.dataset.c4Status) delete el.dataset.c4Status;
    }
  });
  const nodeIds = $derived(nodeSetKey(flowNodes));
  const legendStatuses = $derived(statusesPresent(status, nodeIds.split('\n')));
  const shownMarkers = $derived(
    semanticInfo && markers ? liftMarkers(semanticInfo.tree, semanticInfo.vis, markers) : markers
  );

  // Semantic camera: what to frame and the signature that decides when to move.
  // Following, it frames the focus (its drawn ancestor if hidden) and refits when
  // that box changes; manually, it frames the open code panel or the scope and
  // refits only when what is drawn, the scope or the open panel changes.
  // While a layout computes it holds the last frame: a new focus or scope read
  // against the old layout would aim at a stale box, then move again on landing.
  let lastFrame: { key: string; rect: LayoutPosition | null; follow: boolean } | undefined;
  const frame = $derived.by(() => {
    if (laying && lastFrame) return lastFrame;
    if (!semanticInfo) return undefined;
    const { tree, vis, rects } = semanticInfo;
    const panels = [...vis.panels];
    const target =
      follow && focusId
        ? representative(tree, vis, focusId)
        : (panels.at(-1) ?? (scopeId && rects.has(scopeId) ? scopeId : undefined));
    let rect = target ? (rects.get(target) ?? null) : null;
    // A code panel keeps its boundary's label row in view, so the nesting reads.
    const box = target && vis.panels.has(target) ? rects.get(tree.parent.get(target) ?? '') : undefined;
    if (rect && box) rect = unionRect([rect, { x: rect.x, y: box.y, width: rect.width, height: 1 }]);
    rect ??= unionRect(rects.values());
    const r = rect ? [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(',') : '';
    const key = follow ? `F|${target}|${r}` : `M|${nodeIds}|${scopeId ?? ''}|${panels.join(',')}`;
    return (lastFrame = { key, rect, follow: !!follow });
  });

  // A user gesture carries its DOM event; programmatic moves (fitView, the
  // follow camera) pass null. Report once per gesture.
  let manualReported = false;
  function onMoveStart() {
    manualReported = false;
  }
  function onMove(event: MouseEvent | TouchEvent | null) {
    if (!event || manualReported) return;
    manualReported = true;
    onmanualcamera?.();
  }
  // The zoom buttons and the minimap (pannable, zoomable) move the camera
  // programmatically, so their gestures never reach onMove: catch them here.
  function onCanvasGesture(event: Event) {
    const t = event.target as Element | null;
    if (t?.closest?.('.svelte-flow__controls, .svelte-flow__minimap')) onmanualcamera?.();
  }

  // Keyboard twin of a node click: SvelteFlow makes node wrappers focusable,
  // and Enter or Space on one runs the same activateNode its click runs.
  // Only on the wrapper itself: a control inside a node (a link, a panel's
  // Before/After switch, a port badge) keeps its own keys.
  function onCanvasKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const t = event.target as Element | null;
    if (!t?.classList?.contains('svelte-flow__node')) return;
    const id = t.getAttribute('data-id');
    const node = id ? flowNodes.find((n) => n.id === id) : undefined;
    if (!node) return;
    event.preventDefault();
    activateNode(node.type, node.data as unknown as C4NodeData);
  }
</script>

<div
  class="c4-diagram {className}"
  role="figure"
  aria-label={diagram.title || (levelLabels[diagram.level] ?? diagram.level)}
>
  <!-- Header: a host that draws its own chrome passes an empty title. -->
  {#if diagram.title}
    <div class="c4-header">
      <div class="c4-title-row">
        <h3 class="c4-title">{diagram.title}</h3>
        <span class="c4-level-badge">{levelLabels[diagram.level] ?? diagram.level}</span>
      </div>
      {#if diagram.description}
        <p class="c4-description">{diagram.description}</p>
      {/if}
    </div>
  {/if}

  <!-- Flow canvas -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={canvas}
    class={semanticInfo ? 'c4-canvas c4-semantic' : 'c4-canvas'}
    data-c4-moving={moving ? '' : undefined}
    onpointerdowncapture={onCanvasGesture}
    onwheelcapture={onCanvasGesture}
    onkeydown={onCanvasKeydown}
  >
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
        nodes={shownNodes}
        edges={flowEdges}
        {nodeTypes}
        {edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        colorMode="dark"
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={selectedId === undefined}
        minZoom={0.15}
        maxZoom={4}
        defaultMarkerColor={EDGE_STROKE}
        proOptions={{ hideAttribution: true }}
        onmovestart={onMoveStart}
        onmove={onMove}
      >
        <C4LiveLayer ids={nodeIds} {focusId} {follow} markers={shownMarkers} {frame} />
        <Background
          gap={24}
        />
        <Controls
          showLock={false}
          position="bottom-right"
        />
        <MiniMap
          position="bottom-left"
          width={160}
          height={110}
          nodeColor={(node) => (node.class === 'c4-leaving' ? 'transparent' : node.type === 'group' ? MINIMAP_GROUP : MINIMAP_NODE)}
          nodeBorderRadius={4}
        />
      </SvelteFlow>
    {/if}
  </div>

  <!-- Legend: the live statuses on the map when `status` is given, else the C4 shapes. -->
  {#if layoutReady && !layoutError && status}
    {#if legendStatuses.length > 0}
      <div class="c4-legend" role="list" aria-label="Status legend">
        {#each legendStatuses as st (st)}
          <div class="c4-legend-item" role="listitem">
            <span class="c4-status-swatch" data-c4-swatch={st}></span>
            <span>{STATUS_LABELS[st]}</span>
          </div>
        {/each}
      </div>
    {/if}
  {:else if layoutReady && !layoutError}
    <div class="c4-legend" role="list" aria-label="Diagram legend">
      {#each SHAPE_LEGEND as item (item.shape)}
        <div class="c4-legend-item" role="listitem">
          <span class="c4-legend-swatch" data-c4-shape={item.shape}></span>
          <span>{item.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .c4-diagram {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--ripple-surface-foreground);
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
    letter-spacing: -0.005em;
    color: var(--ripple-surface-foreground);
  }

  .c4-level-badge {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ripple-accent);
    background: color-mix(in oklab, var(--ripple-accent) 12%, transparent);
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .c4-description {
    margin: 0;
    font-size: 12px;
    color: var(--ripple-muted-foreground);
  }

  /* ---- Canvas ----
     480px in an auto-height parent (the legacy size); fills a parent that
     gives the diagram a height. SvelteFlow's theme variables are mapped to
     ripple tokens here, so the canvas follows the host's light/dark theme. */
  .c4-canvas {
    width: 100%;
    flex: 1 1 480px;
    min-height: 0;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid var(--ripple-border);
    background: var(--ripple-surface);
    /* An opaque ground for things that sit ON the map (node cards, edge
       labels, controls). The host's surfaces may be translucent glass, which
       lets edges and the grid read through; this inverts the ink's lightness
       instead (dark ink -> near-white ground, light ink -> near-black), and
       cards layer the host's card tint over it. */
    --c4-ground: oklch(from var(--ripple-surface-foreground) calc(1.13 - l * 0.96) calc(c * 0.5) h);
    --c4-card: linear-gradient(var(--ripple-surface) 0 0), var(--c4-ground);
    --xy-background-pattern-color: var(--ripple-border);
    --xy-edge-stroke: color-mix(in oklab, var(--ripple-muted-foreground) 55%, transparent);
    --xy-edge-label-background-color: var(--ripple-surface);
    --xy-edge-label-color: var(--ripple-muted-foreground);
    --xy-controls-button-background-color: var(--ripple-surface);
    --xy-controls-button-background-color-hover: var(--ripple-muted);
    --xy-controls-button-color: var(--ripple-muted-foreground);
    --xy-controls-button-color-hover: var(--ripple-surface-foreground);
    --xy-controls-button-border-color: var(--ripple-border);
    --xy-controls-box-shadow: none;
    --xy-minimap-background-color: var(--ripple-surface);
    --xy-minimap-mask-background-color: color-mix(in oklab, var(--ripple-surface-foreground) 7%, transparent);
    --xy-minimap-mask-stroke-color: var(--ripple-border);
    /* Everything else xyflow colours, so the fixed palette behind colorMode never shows. */
    --xy-background-color: transparent;
    --xy-attribution-background-color: transparent;
    --xy-connectionline-stroke: var(--ripple-muted-foreground);
    --xy-edge-stroke-selected: var(--ripple-accent);
    --xy-node-color: var(--ripple-surface-foreground);
    --xy-node-background-color: transparent;
    --xy-node-border: none;
    --xy-node-group-background-color: transparent;
    --xy-node-boxshadow-hover: none;
    --xy-node-boxshadow-selected: none;
    --xy-handle-background-color: var(--ripple-muted-foreground);
    --xy-handle-border-color: var(--ripple-surface);
    --xy-selection-background-color: color-mix(in oklab, var(--ripple-accent) 8%, transparent);
    --xy-selection-border: 1px dotted color-mix(in oklab, var(--ripple-accent) 60%, transparent);
    --xy-minimap-node-background-color: color-mix(in oklab, var(--ripple-muted-foreground) 45%, transparent);
    --xy-minimap-node-stroke-color: transparent;
    --xy-resize-background-color: var(--ripple-accent);
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
    color: var(--ripple-muted-foreground);
  }

  .c4-error {
    color: var(--ripple-error-text);
  }

  .c4-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--ripple-border);
    border-top-color: var(--ripple-accent);
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
    padding: 2px 4px;
  }

  .c4-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ripple-muted-foreground);
  }

  .c4-legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
    border: 1px solid color-mix(in oklab, var(--ripple-surface-foreground) 30%, transparent);
    background: var(--ripple-surface);
  }
  .c4-legend-swatch[data-c4-shape='person'] {
    border-radius: 50%;
    border-color: transparent;
    background: color-mix(in oklab, var(--ripple-accent) 40%, transparent);
  }
  .c4-legend-swatch[data-c4-shape='container'] {
    border-radius: 2px;
  }
  .c4-legend-swatch[data-c4-shape='database'] {
    border-radius: 50% / 30%;
    border-color: color-mix(in oklab, var(--ripple-info) 55%, transparent);
    background: color-mix(in oklab, var(--ripple-info) 20%, transparent);
  }
  .c4-legend-swatch[data-c4-shape='queue'] {
    border-color: transparent;
    background: color-mix(in oklab, var(--ripple-warning) 35%, transparent);
  }
  .c4-legend-swatch[data-c4-shape='external'] {
    border-style: dashed;
    background: transparent;
  }

  /* ---- SvelteFlow overrides ---- */
  .c4-canvas :global(.svelte-flow),
  .c4-canvas :global(.svelte-flow__background) {
    background: transparent !important;
  }

  .c4-canvas :global(.svelte-flow__node) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: var(--c4-r);
  }

  /* Selection (and keyboard focus): an accent ring set off from the node, so
     a status ring stays readable inside it. */
  .c4-canvas :global(.svelte-flow__node:focus) {
    outline: none;
  }
  .c4-canvas :global(.svelte-flow__node.selected),
  .c4-canvas :global(.svelte-flow__node:focus-visible) {
    outline: 2px solid var(--ripple-accent);
    outline-offset: 3px;
  }

  /* Handles only anchor edges here (nothing is connectable), so hide them. */
  .c4-canvas :global(.c4-handle) {
    opacity: 0;
    pointer-events: none;
  }

  .c4-canvas :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    stroke-dasharray: 8 4;
    animation: c4-dash 0.8s linear infinite;
  }

  .c4-canvas :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke: var(--ripple-accent) !important;
    stroke-width: 2px;
  }

  .c4-canvas :global(.svelte-flow__edge-label) {
    font-size: calc(11px / clamp(0.6, var(--c4-zoom, 1), 1));
    font-weight: 500;
    line-height: 1.2;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid var(--ripple-border);
    background: var(--c4-card);
  }

  .c4-canvas :global(.svelte-flow__controls),
  .c4-canvas :global(.svelte-flow__minimap) {
    border: 1px solid var(--ripple-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--c4-card);
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

  @media (prefers-reduced-motion: reduce) {
    .c4-spinner {
      animation: none;
    }
    .c4-canvas :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
      animation: none;
    }
  }

  /* ---- The shared node card ----
     Every node component renders these classes; the rules live here once.
     Names counter-scale with the zoom (C4LiveLayer writes --c4-zoom on the
     flow root) so they stay legible when the map is zoomed out, and the
     secondary lines drop away once it is far out (data-c4-far). */
  .c4-canvas :global(.c4-node) {
    position: relative;
    box-sizing: border-box;
    /* Fill the ELK box SvelteFlow sizes the wrapper to: routes end on this edge. */
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: safe center;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--ripple-border);
    background: var(--c4-card);
    color: var(--ripple-surface-foreground);
    text-align: center;
    cursor: pointer;
    transition:
      border-color 150ms var(--ripple-ease-out),
      transform 150ms var(--ripple-ease-out);
  }

  .c4-canvas :global(.c4-node > *) {
    flex-shrink: 0;
  }

  /* Per-type card overrides live here, after the shared rule they refine. */
  .c4-canvas :global(.c4-person-node) {
    border-radius: 12px;
    gap: 6px;
  }
  .c4-canvas :global(.c4-component-node) {
    border-radius: 8px;
  }
  .c4-canvas :global(.c4-component-node.is-code) {
    padding-inline: 10px;
  }
  /* A file name is one long token: the host's mono face (font-mono on the
     element) at a size that fits the box. */
  .c4-canvas :global(.c4-component-node.is-code .c4-node-name) {
    font-size: calc(12px / clamp(0.5, var(--c4-zoom, 1), 1));
    font-weight: 500;
    letter-spacing: 0;
  }

  .c4-canvas :global(.c4-node:hover) {
    border-color: color-mix(in oklab, var(--ripple-surface-foreground) 24%, transparent);
    transform: translateY(-1px);
  }

  .c4-canvas :global(.c4-node.is-external) {
    border-style: dashed;
    border-color: color-mix(in oklab, var(--ripple-surface-foreground) 20%, transparent);
  }

  .c4-canvas :global(.c4-node.is-external .c4-node-name) {
    color: var(--ripple-muted-foreground);
  }

  .c4-canvas :global(.c4-node-kind) {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ripple-muted-foreground);
  }

  .c4-canvas :global(.c4-node-name) {
    font-size: calc(13px / clamp(0.5, var(--c4-zoom, 1), 1));
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.005em;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .c4-canvas :global(.c4-node-desc) {
    font-size: 11px;
    line-height: 1.35;
    text-align: center;
    color: var(--ripple-muted-foreground);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .c4-canvas :global(.c4-node-tech) {
    font-size: calc(11px / clamp(0.6, var(--c4-zoom, 1), 1));
    line-height: 1.3;
    color: var(--ripple-muted-foreground);
    background: var(--ripple-muted);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .c4-canvas :global(.c4-node-docs) {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: var(--ripple-accent);
    text-decoration: none;
  }

  .c4-canvas :global(.c4-node-docs:hover) {
    text-decoration: underline;
  }

  .c4-canvas :global(.c4-node-drill) {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--ripple-muted-foreground);
  }

  .c4-canvas :global(.svelte-flow[data-c4-far] .c4-node-kind),
  .c4-canvas :global(.svelte-flow[data-c4-far] .c4-node-desc),
  .c4-canvas :global(.svelte-flow[data-c4-far] .c4-node-docs) {
    display: none;
  }

  /* ---- Semantic zoom ----
     Nodes glide and resize to their new layout on the ripple curve (the camera
     eases on the same curve in C4LiveLayer), fade in where they first appear,
     and fade out where they were when they leave. Edges and marker dots are
     drawn for the final layout, so they sit the move out. Ghosts are context. */
  .c4-semantic :global(.svelte-flow__node) {
    transition:
      transform 560ms var(--ripple-ease-out),
      opacity 280ms var(--ripple-ease-out);
    animation: c4-node-in 360ms var(--ripple-ease-out) 140ms backwards;
  }

  /* A node whose box changed size (markResized): the wrapper takes the new size
     at once (resizing it per frame would re-measure it and re-lay every edge
     per frame) while its card and status ring grow from the old size. Two
     names, alternated per layout, so every move restarts the animation. */
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='a'] > :not(.c4-handle)) {
    animation: c4-size-a 560ms var(--ripple-ease-out);
  }
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='b'] > :not(.c4-handle)) {
    animation: c4-size-b 560ms var(--ripple-ease-out);
  }
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='a'])::after {
    animation: c4-ring-a 560ms var(--ripple-ease-out);
  }
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='b'])::after {
    animation: c4-ring-b 560ms var(--ripple-ease-out);
  }
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='a'][data-c4-status='changing'])::after {
    animation: c4-ring-a 560ms var(--ripple-ease-out), c4-breathe 2.4s ease-in-out infinite;
  }
  .c4-semantic :global(.svelte-flow__node[data-c4-resized='b'][data-c4-status='changing'])::after {
    animation: c4-ring-b 560ms var(--ripple-ease-out), c4-breathe 2.4s ease-in-out infinite;
  }

  @keyframes c4-size-a {
    from { width: var(--c4-from-w); height: var(--c4-from-h); }
  }
  @keyframes c4-size-b {
    from { width: var(--c4-from-w); height: var(--c4-from-h); }
  }
  @keyframes c4-ring-a {
    from { width: calc(var(--c4-from-w) + 2px); height: calc(var(--c4-from-h) + 2px); }
  }
  @keyframes c4-ring-b {
    from { width: calc(var(--c4-from-w) + 2px); height: calc(var(--c4-from-h) + 2px); }
  }

  @keyframes c4-node-in {
    from { opacity: 0; }
  }

  .c4-semantic :global(.svelte-flow__node[data-c4-ghost]) {
    opacity: 0.38;
  }

  .c4-semantic :global(.svelte-flow__node.c4-leaving) {
    opacity: 0;
    pointer-events: none;
  }

  .c4-semantic :global(.svelte-flow__edges),
  .c4-semantic :global(.svelte-flow__edge-labels),
  .c4-semantic :global(.svelte-flow__node-toolbar) {
    transition: opacity 240ms var(--ripple-ease-out);
  }

  .c4-semantic[data-c4-moving] :global(.svelte-flow__edges),
  .c4-semantic[data-c4-moving] :global(.svelte-flow__edge-labels),
  .c4-semantic[data-c4-moving] :global(.svelte-flow__node-toolbar) {
    opacity: 0;
    transition-duration: 120ms;
  }

  .c4-semantic :global(.svelte-flow__edge.c4-ghost) {
    opacity: 0.35;
  }

  .c4-canvas :global(.svelte-flow__edge-label.c4-ghost-label) {
    opacity: 0.45;
  }

  /* A port badge is its own pill; its EdgeLabel wrapper draws nothing. */
  .c4-canvas :global(.svelte-flow__edge-label.c4-badge-label) {
    padding: 0;
    border: none;
    background: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .c4-semantic :global(.svelte-flow__node) {
      transition: none;
      animation: none;
    }
    .c4-semantic :global(.svelte-flow__edges),
    .c4-semantic :global(.svelte-flow__edge-labels),
    .c4-semantic :global(.svelte-flow__node-toolbar) {
      transition: none;
    }
  }

  /* ---- Live status: data-c4-status on the SvelteFlow node wrapper ----
     One ring drawn over the node's own edge, so every node shape gets the same
     treatment without each node component knowing about status. Tones are
     ripple tokens; `changing` is the only one that moves. */
  .c4-canvas :global(.svelte-flow__node) {
    --c4-r: 10px;
  }
  .c4-canvas :global(.svelte-flow__node-person),
  .c4-canvas :global(.svelte-flow__node-group) {
    --c4-r: 12px;
  }
  .c4-canvas :global(.svelte-flow__node-component) {
    --c4-r: 8px;
  }

  .c4-canvas :global(.svelte-flow__node[data-c4-status])::after {
    content: '';
    position: absolute;
    /* inset: -1px, as a size the resize animation can grow from (c4-ring). */
    top: -1px;
    left: -1px;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    border-radius: var(--c4-r);
    border: 1.5px solid var(--c4-tone);
    pointer-events: none;
    transition: border-color 180ms var(--ripple-ease-out), box-shadow 180ms var(--ripple-ease-out);
  }

  .c4-canvas :global(.svelte-flow__node[data-c4-status='changing']),
  .c4-status-swatch[data-c4-swatch='changing'] {
    --c4-tone: var(--ripple-accent);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='changed']),
  .c4-status-swatch[data-c4-swatch='changed'] {
    --c4-tone: color-mix(in oklab, var(--ripple-accent) 55%, transparent);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='landed']),
  .c4-status-swatch[data-c4-swatch='landed'] {
    --c4-tone: var(--ripple-success);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='failed']),
  .c4-status-swatch[data-c4-swatch='failed'] {
    --c4-tone: var(--ripple-error);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='drift']),
  .c4-status-swatch[data-c4-swatch='drift'] {
    --c4-tone: var(--ripple-warning);
  }

  .c4-canvas :global(.svelte-flow__node[data-c4-status='drift'])::after {
    border-style: dashed;
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='failed'])::after {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--ripple-error) 16%, transparent);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='changing'])::after {
    animation: c4-breathe 2.4s ease-in-out infinite;
  }

  @keyframes c4-breathe {
    0%, 100% { box-shadow: 0 0 0 2px color-mix(in oklab, var(--ripple-accent) 10%, transparent); }
    50% { box-shadow: 0 0 0 7px color-mix(in oklab, var(--ripple-accent) 22%, transparent); }
  }

  @media (prefers-reduced-motion: reduce) {
    .c4-canvas :global(.svelte-flow__node[data-c4-status='changing'])::after {
      animation: none;
      box-shadow: 0 0 0 4px color-mix(in oklab, var(--ripple-accent) 18%, transparent);
    }
  }

  .c4-status-swatch {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: 3px;
    border: 1.5px solid var(--c4-tone);
    background: color-mix(in oklab, var(--c4-tone) 18%, transparent);
  }
  .c4-status-swatch[data-c4-swatch='drift'] {
    border-style: dashed;
  }

  /* Planned: a node that does not exist in code yet, drawn as a blueprint. A
     dashed muted outline over a card with no fill or border of its own, its
     content dimmed. Distinct from the scope ghost (the whole node faded, its
     outline unchanged) and from drift (a dashed warning ring on a full card).
     The dim is on the content, not the wrapper, so it composes with the ghost's
     wrapper opacity instead of fighting it; the handles stay hidden. */
  .c4-canvas :global(.svelte-flow__node[data-c4-status='planned']),
  .c4-status-swatch[data-c4-swatch='planned'] {
    --c4-tone: color-mix(in oklab, var(--ripple-muted-foreground) 75%, transparent);
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='planned'])::after {
    border-style: dashed;
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='planned'] > :not(.c4-handle)) {
    opacity: 0.6;
  }
  .c4-canvas :global(.svelte-flow__node[data-c4-status='planned'] .c4-node) {
    background: transparent;
    border-color: transparent;
  }
  .c4-status-swatch[data-c4-swatch='planned'] {
    border-style: dashed;
    background: transparent;
  }
</style>
