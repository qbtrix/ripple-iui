<!--
  C4Diagram.svelte — Interactive C4 Model diagram widget for Ripple UI.
  Created: SVG-based renderer for all 4 C4 levels (Context, Container, Component, Code).
  Supports click/drill-down events, hover tooltips, zoom/pan, and dark mode via CSS custom properties.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { C4Diagram, C4Element, C4Relationship, LayoutNode } from './types.js';
  import { autoLayout } from './layout.js';

  interface Props {
    diagram: C4Diagram;
    class?: string;
    onclick?: (elementId: string) => void;
    ondrilldown?: (elementId: string, level: string) => void;
  }

  let {
    diagram,
    class: className,
    onclick,
    ondrilldown,
  }: Props = $props();

  // Layout state
  let hoveredId: string | null = $state(null);
  let viewBox = $state({ x: 0, y: 0, width: 900, height: 600 });
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0 });

  // Compute layout positions for all elements
  const layoutMap = $derived(autoLayout(diagram.elements, diagram.relationships));

  // Compute SVG viewBox to fit all elements with padding
  const computedViewBox = $derived.by(() => {
    const nodes = Array.from(layoutMap.values());
    if (nodes.length === 0) return { x: -50, y: -50, width: 900, height: 600 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const pad = 60;
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  });

  // Element classification helpers
  function isPerson(el: C4Element): boolean {
    return !('technology' in el) && !('type' in el) && !('containers' in el) && !('components' in el);
  }

  function isExternal(el: C4Element): boolean {
    return 'external' in el && (el as { external?: boolean }).external === true;
  }

  function isDatabase(el: C4Element): boolean {
    return 'type' in el && (el as { type?: string }).type === 'database';
  }

  function isQueue(el: C4Element): boolean {
    return 'type' in el && (el as { type?: string }).type === 'queue';
  }

  function hasDrillDown(el: C4Element): boolean {
    return ('containers' in el && Array.isArray((el as any).containers) && (el as any).containers.length > 0)
      || ('components' in el && Array.isArray((el as any).components) && (el as any).components.length > 0);
  }

  // Color scheme based on element type
  function getElementColor(el: C4Element): { fill: string; stroke: string; text: string } {
    if (isPerson(el)) {
      return isExternal(el)
        ? { fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))', text: 'hsl(var(--muted-foreground))' }
        : { fill: 'hsl(220 80% 45%)', stroke: 'hsl(220 80% 35%)', text: '#ffffff' };
    }
    if (isExternal(el)) {
      return { fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))', text: 'hsl(var(--muted-foreground))' };
    }
    if (isDatabase(el)) {
      return { fill: 'hsl(250 60% 45%)', stroke: 'hsl(250 60% 35%)', text: '#ffffff' };
    }
    if (isQueue(el)) {
      return { fill: 'hsl(30 80% 45%)', stroke: 'hsl(30 80% 35%)', text: '#ffffff' };
    }
    // Internal system/container/component
    return { fill: 'hsl(220 70% 50%)', stroke: 'hsl(220 70% 40%)', text: '#ffffff' };
  }

  // Relationship style
  function getRelStyle(rel: C4Relationship): { dasharray: string; color: string } {
    switch (rel.style) {
      case 'async':
        return { dasharray: '8 4', color: 'hsl(var(--muted-foreground) / 0.6)' };
      case 'event':
        return { dasharray: '4 4', color: 'hsl(30 80% 50% / 0.7)' };
      default:
        return { dasharray: '', color: 'hsl(var(--muted-foreground) / 0.5)' };
    }
  }

  // Compute center point of a layout node
  function nodeCenter(node: LayoutNode): { cx: number; cy: number } {
    return { cx: node.x + node.width / 2, cy: node.y + node.height / 2 };
  }

  // Compute arrow path between two elements (curved line with arrowhead offset)
  function computeArrowPath(fromId: string, toId: string): string | null {
    const from = layoutMap.get(fromId);
    const to = layoutMap.get(toId);
    if (!from || !to) return null;

    const { cx: x1, cy: y1 } = nodeCenter(from);
    const { cx: x2, cy: y2 } = nodeCenter(to);

    // Offset endpoints to box edges
    const start = clipToBox(x1, y1, x2, y2, from);
    const end = clipToBox(x2, y2, x1, y1, to);

    // Simple curved path
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const cx = start.x + dx / 2;
    const cy = start.y + dy / 2;
    // Slight curve offset perpendicular to line
    const len = Math.sqrt(dx * dx + dy * dy);
    const curveAmount = Math.min(30, len * 0.1);
    const nx = -dy / (len || 1) * curveAmount;
    const ny = dx / (len || 1) * curveAmount;

    return `M ${start.x} ${start.y} Q ${cx + nx} ${cy + ny} ${end.x} ${end.y}`;
  }

  // Clip a line from (cx, cy) toward (tx, ty) to the edge of a box
  function clipToBox(cx: number, cy: number, tx: number, ty: number, box: LayoutNode): { x: number; y: number } {
    const dx = tx - cx;
    const dy = ty - cy;
    const hw = box.width / 2;
    const hh = box.height / 2;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    // Check intersection with each edge
    let t = Infinity;
    if (dx !== 0) {
      const tRight = hw / Math.abs(dx);
      const tLeft = hw / Math.abs(dx);
      t = Math.min(t, dx > 0 ? tRight : tLeft);
    }
    if (dy !== 0) {
      const tBottom = hh / Math.abs(dy);
      const tTop = hh / Math.abs(dy);
      t = Math.min(t, dy > 0 ? tBottom : tTop);
    }

    return { x: cx + dx * t, y: cy + dy * t };
  }

  // Compute label position for a relationship (midpoint of the path)
  function computeLabelPos(fromId: string, toId: string): { x: number; y: number } | null {
    const from = layoutMap.get(fromId);
    const to = layoutMap.get(toId);
    if (!from || !to) return null;

    const { cx: x1, cy: y1 } = nodeCenter(from);
    const { cx: x2, cy: y2 } = nodeCenter(to);

    // Offset slightly above midpoint
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 12 };
  }

  // Event handlers
  function handleElementClick(el: C4Element) {
    onclick?.(el.id);
    if (hasDrillDown(el) && ondrilldown) {
      const nextLevel = diagram.level === 'context' ? 'container'
        : diagram.level === 'container' ? 'component'
        : 'code';
      ondrilldown(el.id, nextLevel);
    }
  }

  // Pan/zoom handlers
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const vb = computedViewBox;

    // Zoom toward center
    const cx = vb.x + vb.width / 2;
    const cy = vb.y + vb.height / 2;
    const nw = vb.width * scale;
    const nh = vb.height * scale;

    viewBox = {
      x: cx - nw / 2,
      y: cy - nh / 2,
      width: nw,
      height: nh,
    };
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    // Scale pan by viewBox/client ratio
    const svg = (e.currentTarget as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const sx = viewBox.width / rect.width;
    const sy = viewBox.height / rect.height;

    viewBox = {
      ...viewBox,
      x: viewBox.x - dx * sx,
      y: viewBox.y - dy * sy,
    };
    panStart = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() {
    isPanning = false;
  }

  // Reset zoom to fit
  function resetZoom() {
    viewBox = { ...computedViewBox };
  }

  // Initialize viewBox on first render
  $effect(() => {
    viewBox = { ...computedViewBox };
  });

  // Level labels for the badge
  const levelLabels: Record<string, string> = {
    context: 'System Context',
    container: 'Container',
    component: 'Component',
    code: 'Code',
  };
</script>

<div class={cn('c4-diagram', className)} role="figure" aria-label={diagram.title}>
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

  <!-- SVG Canvas -->
  <svg
    class="c4-canvas"
    viewBox="{viewBox.x} {viewBox.y} {viewBox.width} {viewBox.height}"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="C4 {levelLabels[diagram.level]} diagram"
    onwheel={handleWheel}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
  >
    <!-- Arrowhead marker definitions -->
    <defs>
      <marker
        id="c4-arrowhead"
        viewBox="0 0 10 7"
        refX="10"
        refY="3.5"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground) / 0.5)" />
      </marker>
      <marker
        id="c4-arrowhead-async"
        viewBox="0 0 10 7"
        refX="10"
        refY="3.5"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground) / 0.6)" />
      </marker>
      <marker
        id="c4-arrowhead-event"
        viewBox="0 0 10 7"
        refX="10"
        refY="3.5"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(30 80% 50% / 0.7)" />
      </marker>
    </defs>

    <!-- Relationships (drawn first, under elements) -->
    {#each diagram.relationships as rel}
      {@const path = computeArrowPath(rel.from, rel.to)}
      {@const style = getRelStyle(rel)}
      {@const labelPos = computeLabelPos(rel.from, rel.to)}
      {#if path}
        <path
          d={path}
          fill="none"
          stroke={style.color}
          stroke-width="1.5"
          stroke-dasharray={style.dasharray}
          marker-end="url(#c4-arrowhead{rel.style === 'async' ? '-async' : rel.style === 'event' ? '-event' : ''})"
        />
        {#if (rel.label || rel.technology) && labelPos}
          <g transform="translate({labelPos.x}, {labelPos.y})">
            <rect
              x={-((rel.label?.length ?? 0) * 3.5 + 8)}
              y="-10"
              width={((rel.label?.length ?? 0) * 7 + 16)}
              height="20"
              rx="4"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border) / 0.3)"
              stroke-width="0.5"
            />
            <text
              text-anchor="middle"
              dominant-baseline="central"
              class="c4-rel-label"
            >
              {rel.label ?? ''}{#if rel.technology}{rel.label ? ' ' : ''}[{rel.technology}]{/if}
            </text>
          </g>
        {/if}
      {/if}
    {/each}

    <!-- Elements -->
    {#each diagram.elements as el}
      {@const node = layoutMap.get(el.id)}
      {@const colors = getElementColor(el)}
      {@const hovered = hoveredId === el.id}
      {@const drillable = hasDrillDown(el)}
      {#if node}
        <g
          transform="translate({node.x}, {node.y})"
          class="c4-element"
          class:c4-drillable={drillable}
          role="button"
          tabindex="0"
          aria-label="{el.name}{el.description ? ': ' + el.description : ''}"
          onclick={() => handleElementClick(el)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleElementClick(el); }}
          onmouseenter={() => hoveredId = el.id}
          onmouseleave={() => hoveredId = null}
          onfocus={() => hoveredId = el.id}
          onblur={() => hoveredId = null}
        >
          {#if isPerson(el)}
            <!-- Person shape: circle head + rounded body -->
            <circle
              cx={node.width / 2}
              cy="28"
              r="24"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Body -->
            <rect
              x={(node.width - 120) / 2}
              y="60"
              width="120"
              height={node.height - 68}
              rx="8"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              stroke-dasharray={isExternal(el) ? '6 3' : ''}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Person icon (simple silhouette in circle) -->
            <text
              x={node.width / 2}
              y="33"
              text-anchor="middle"
              dominant-baseline="central"
              fill={colors.text}
              font-size="18"
            >&#9787;</text>
            <!-- Name -->
            <text
              x={node.width / 2}
              y="82"
              text-anchor="middle"
              dominant-baseline="central"
              class="c4-el-name"
              fill={colors.text}
            >{el.name}</text>
            <!-- Description -->
            {#if el.description}
              <text
                x={node.width / 2}
                y="100"
                text-anchor="middle"
                dominant-baseline="central"
                class="c4-el-desc"
                fill={colors.text}
                opacity="0.75"
              >{el.description}</text>
            {/if}

          {:else if isDatabase(el)}
            <!-- Database shape: cylinder -->
            <ellipse
              cx={node.width / 2}
              cy="16"
              rx={node.width / 2 - 4}
              ry="14"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              opacity={hovered ? 1 : 0.9}
            />
            <rect
              x="4"
              y="16"
              width={node.width - 8}
              height={node.height - 32}
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              opacity={hovered ? 1 : 0.9}
            />
            <ellipse
              cx={node.width / 2}
              cy={node.height - 16}
              rx={node.width / 2 - 4}
              ry="14"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Cover the internal horizontal lines of the rect -->
            <rect
              x="5"
              y="16"
              width={node.width - 10}
              height={node.height - 32}
              fill={colors.fill}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Top ellipse redrawn on top for clean look -->
            <ellipse
              cx={node.width / 2}
              cy="16"
              rx={node.width / 2 - 4}
              ry="14"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Name -->
            <text
              x={node.width / 2}
              y={node.height / 2 - 4}
              text-anchor="middle"
              dominant-baseline="central"
              class="c4-el-name"
              fill={colors.text}
            >{el.name}</text>
            <!-- Technology -->
            {#if 'technology' in el && el.technology}
              <text
                x={node.width / 2}
                y={node.height / 2 + 14}
                text-anchor="middle"
                dominant-baseline="central"
                class="c4-el-tech"
                fill={colors.text}
                opacity="0.7"
              >[{el.technology}]</text>
            {/if}

          {:else if isQueue(el)}
            <!-- Queue shape: parallelogram-ish via skewed rect -->
            <polygon
              points="{20},0 {node.width},0 {node.width - 20},{node.height} 0,{node.height}"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              stroke-dasharray={isExternal(el) ? '6 3' : ''}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Name -->
            <text
              x={node.width / 2}
              y={node.height / 2 - 8}
              text-anchor="middle"
              dominant-baseline="central"
              class="c4-el-name"
              fill={colors.text}
            >{el.name}</text>
            <!-- Technology -->
            {#if 'technology' in el && el.technology}
              <text
                x={node.width / 2}
                y={node.height / 2 + 10}
                text-anchor="middle"
                dominant-baseline="central"
                class="c4-el-tech"
                fill={colors.text}
                opacity="0.7"
              >[{el.technology}]</text>
            {/if}

          {:else}
            <!-- Default box: rounded rectangle for systems, containers, components -->
            <rect
              x="0"
              y="0"
              width={node.width}
              height={node.height}
              rx="10"
              fill={colors.fill}
              stroke={colors.stroke}
              stroke-width={hovered ? 2.5 : 1.5}
              stroke-dasharray={isExternal(el) ? '6 3' : ''}
              opacity={hovered ? 1 : 0.9}
            />
            <!-- Name -->
            <text
              x={node.width / 2}
              y={node.height / 2 - (('technology' in el && el.technology) ? 12 : (el.description ? 6 : 0))}
              text-anchor="middle"
              dominant-baseline="central"
              class="c4-el-name"
              fill={colors.text}
            >{el.name}</text>
            <!-- Technology -->
            {#if 'technology' in el && el.technology}
              <text
                x={node.width / 2}
                y={node.height / 2 + 6}
                text-anchor="middle"
                dominant-baseline="central"
                class="c4-el-tech"
                fill={colors.text}
                opacity="0.7"
              >[{el.technology}]</text>
            {/if}
            <!-- Description (below tech, or below name if no tech) -->
            {#if el.description}
              <text
                x={node.width / 2}
                y={node.height / 2 + (('technology' in el && el.technology) ? 22 : 12)}
                text-anchor="middle"
                dominant-baseline="central"
                class="c4-el-desc"
                fill={colors.text}
                opacity="0.65"
              >{el.description}</text>
            {/if}
            <!-- Drill-down indicator -->
            {#if drillable}
              <text
                x={node.width - 14}
                y={node.height - 12}
                class="c4-drill-icon"
                fill={colors.text}
                opacity="0.5"
              >&#8599;</text>
            {/if}
          {/if}

          <!-- Tooltip on hover -->
          {#if hovered && el.description}
            <title>{el.name}: {el.description}</title>
          {/if}
        </g>
      {/if}
    {/each}
  </svg>

  <!-- Controls -->
  <div class="c4-controls">
    <button class="c4-ctrl-btn" onclick={resetZoom} aria-label="Reset zoom" title="Fit to view">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
      </svg>
    </button>
  </div>

  <!-- Legend -->
  <div class="c4-legend">
    <div class="c4-legend-item">
      <span class="c4-legend-swatch c4-legend-person"></span>
      <span>Person</span>
    </div>
    <div class="c4-legend-item">
      <span class="c4-legend-swatch c4-legend-internal"></span>
      <span>Internal</span>
    </div>
    <div class="c4-legend-item">
      <span class="c4-legend-swatch c4-legend-external"></span>
      <span>External</span>
    </div>
    <div class="c4-legend-item">
      <span class="c4-legend-swatch c4-legend-database"></span>
      <span>Database</span>
    </div>
  </div>
</div>

<style>
  .c4-diagram {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

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
    color: hsl(var(--foreground));
  }

  .c4-level-badge {
    font-size: 10px;
    font-weight: 500;
    color: hsl(var(--primary-foreground));
    background: hsl(var(--primary));
    padding: 2px 8px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .c4-description {
    margin: 0;
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }

  .c4-canvas {
    width: 100%;
    height: 420px;
    border-radius: 10px;
    border: 1px solid hsl(var(--border) / 0.4);
    background: hsl(var(--background));
    cursor: grab;
    user-select: none;
  }

  .c4-canvas:active {
    cursor: grabbing;
  }

  /* Element text styles */
  .c4-canvas :global(.c4-el-name) {
    font-size: 12px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .c4-canvas :global(.c4-el-tech) {
    font-size: 9px;
    font-weight: 400;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .c4-canvas :global(.c4-el-desc) {
    font-size: 9px;
    font-weight: 400;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .c4-canvas :global(.c4-rel-label) {
    font-size: 9px;
    font-weight: 500;
    fill: hsl(var(--muted-foreground));
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .c4-canvas :global(.c4-drill-icon) {
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Interactive element hover */
  .c4-element {
    cursor: pointer;
    outline: none;
    transition: opacity 0.15s ease;
  }

  .c4-element:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: 8px;
  }

  .c4-drillable {
    cursor: zoom-in;
  }

  /* Controls */
  .c4-controls {
    position: relative;
    display: flex;
    justify-content: flex-end;
    margin-top: -40px;
    margin-right: 8px;
    margin-bottom: 4px;
    pointer-events: none;
    z-index: 10;
  }

  .c4-ctrl-btn {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid hsl(var(--border) / 0.5);
    border-radius: 6px;
    background: hsl(var(--card));
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .c4-ctrl-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  /* Legend */
  .c4-legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    padding: 4px 0;
  }

  .c4-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: hsl(var(--muted-foreground));
  }

  .c4-legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    border: 1px solid transparent;
  }

  .c4-legend-person {
    background: hsl(220 80% 45%);
    border-radius: 50%;
  }

  .c4-legend-internal {
    background: hsl(220 70% 50%);
  }

  .c4-legend-external {
    background: hsl(var(--muted));
    border-color: hsl(var(--border));
    border-style: dashed;
  }

  .c4-legend-database {
    background: hsl(250 60% 45%);
    border-radius: 3px 3px 50% 50%;
  }
</style>
