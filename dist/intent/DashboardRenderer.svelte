<!--
  DashboardRenderer.svelte — Renders intent='dashboard' specs as a mutable widget grid.
  Created: 2026-03-27 — Ported from ocean-flow DashboardRenderer with Ripple widget system.
  Updated: 2026-03-27 — Reorderable action with debug logging, Svelte animate:flip,
  expand/collapse toggle (column-span:all in masonry, full-row in grid).
-->
<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import type { UniversalSpec } from '../schema/universal-spec.js';
  import { createDashboardManager, type DashboardSpec, type DashboardWidget } from './dashboard-manager.svelte.js';
  import { reorderable } from '../actions/reorderable.js';
  import NodeRenderer from '../components/NodeRenderer.svelte';

  interface Props {
    spec: UniversalSpec;
    onSpecChanged?: (spec: DashboardSpec) => void;
  }

  let { spec, onSpecChanged }: Props = $props();

  let dashboardSpec = $derived.by((): DashboardSpec => {
    const widgets: DashboardWidget[] = (spec as any).widgets ?? [];
    const layout = (spec as any).dashboard_layout ?? {
      type: 'grid' as const,
      columns: (spec.display?.columns ?? 3),
      gap: 10,
    };
    return { widgets, layout };
  });

  let isMasonry = $derived(dashboardSpec.layout?.type === 'masonry');

  const manager = createDashboardManager();

  $effect(() => {
    manager.load(dashboardSpec);
  });

  $effect(() => {
    if (onSpecChanged) {
      manager.onChange(onSpecChanged);
    }
  });

  setContext('dashboard-manager', manager);

  // --- Expand/collapse state ---
  let expandedIds = $state<Set<string>>(new Set());

  function toggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedIds = next;
  }

  function isExpanded(id: string): boolean {
    return expandedIds.has(id);
  }

  function getSpan(widget: DashboardWidget): number {
    // Expanded widgets always span full row
    if (isExpanded(widget.id)) return dashboardSpec.layout?.columns ?? 3;
    if (widget.span) return Math.min(widget.span, dashboardSpec.layout?.columns ?? 3);
    const cols = dashboardSpec.layout?.columns ?? 3;
    switch (widget.size) {
      case 'sm': return 1;
      case 'md': return Math.min(2, cols);
      case 'lg': return Math.min(3, cols);
      case 'xl': case 'full': return cols;
      default: return 1;
    }
  }

  function widgetToNode(widget: DashboardWidget): any {
    if (widget.children && widget.children.length > 0) {
      return { type: 'container', children: widget.children };
    }

    const node: any = {
      type: widget.type,
      props: { ...widget.props },
    };

    if (widget.data !== undefined) {
      switch (widget.type) {
        case 'chart':
          node.props.data = widget.data;
          break;
        case 'table':
          node.props.data = widget.data;
          break;
        case 'metric':
          if (typeof widget.data === 'object' && !Array.isArray(widget.data)) {
            node.props = { ...node.props, ...widget.data };
          }
          break;
        case 'feed':
          node.props.items = widget.data;
          break;
        case 'text':
          node.props.text = typeof widget.data === 'string' ? widget.data : JSON.stringify(widget.data);
          break;
        case 'flex':
          if (Array.isArray(widget.data)) {
            node.props = { ...node.props, direction: 'column', ...widget.props };
            node.children = widget.data.map((s: any, i: number) => ({
              type: 'flex',
              props: { justify: 'between', align: 'center' },
              children: [
                { type: 'text', props: { text: s.label, size: 'xs' } },
                { type: 'flex', props: { align: 'center', gap: '6px' }, children: [
                  { type: 'text', props: { text: String(s.value), size: 'lg', weight: 'semibold' } },
                  ...(s.trend ? [{ type: 'badge', props: {
                    text: s.trend,
                    variant: s.trend.startsWith('+') ? 'success' : s.trend.startsWith('-') ? 'destructive' : 'secondary'
                  }}] : []),
                ]},
              ],
            }));
          }
          break;
        default:
          node.props.data = widget.data;
      }
    }

    if (widget.title && !node.props.title) {
      node.props.title = widget.title;
    }

    return node;
  }

  let reorderItems = $derived(manager.spec.widgets.map(w => ({ id: w.id })));

  function handleReorder(ids: string[]) {
    manager.reorder(ids);
  }

  let mounted = $state(false);
  onMount(() => { requestAnimationFrame(() => { mounted = true; }); });
</script>

<div class="ripple-dashboard" class:ripple-dashboard--mounted={mounted}>
  {#if spec.title}
    <div class="ripple-dashboard-header">
      <h2 class="ripple-dashboard-title">{spec.title}</h2>
      {#if spec.description}
        <p class="ripple-dashboard-desc">{spec.description}</p>
      {/if}
    </div>
  {/if}

  <div
    class="ripple-dashboard-layout"
    class:ripple-masonry={isMasonry}
    class:ripple-grid={!isMasonry}
    style={isMasonry
      ? `--masonry-gap:${dashboardSpec.layout?.gap ?? 10}px`
      : `--dashboard-columns:${dashboardSpec.layout?.columns ?? 3};--dashboard-gap:${dashboardSpec.layout?.gap ?? 10}px`
    }
    use:reorderable={{ items: reorderItems, onReorder: handleReorder, handle: '[data-grip]', debug: true }}
  >
    {#each manager.spec.widgets as widget, wi (widget.id)}
      {@const node = widgetToNode(widget)}
      {@const widgetColor = widget.props?.color}
      {@const expanded = isExpanded(widget.id)}
      <div
        class="ripple-dashboard-cell"
        class:ripple-grid-cell={!isMasonry}
        class:ripple-cell--expanded={expanded}
        data-reorder-id={widget.id}
        style={!isMasonry ? `grid-column: span ${getSpan(widget)}` : ''}
        in:fly={{ y: 12, duration: 300, delay: wi * 50 }}
        animate:flip={{ duration: 250 }}
      >
        <div class="ripple-widget-card" class:ripple-widget-card--expanded={expanded}>
          {#if widget.title}
            <div class="ripple-widget-header" style={widgetColor ? `border-left: 3px solid ${widgetColor}; padding-left: 9px;` : ''}>
              <!-- Grip handle -->
              <button class="ripple-grip-handle" data-grip aria-label="Drag to reorder">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" opacity="0.35">
                  <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                  <circle cx="2" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
                  <circle cx="2" cy="10" r="1.2"/><circle cx="8" cy="10" r="1.2"/>
                  <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                </svg>
              </button>
              <span class="ripple-widget-title">{widget.title}</span>
              <!-- Expand/collapse toggle -->
              <button
                class="ripple-expand-btn"
                aria-label={expanded ? 'Collapse widget' : 'Expand widget'}
                onclick={() => toggleExpand(widget.id)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  {#if expanded}
                    <!-- Collapse icon (arrows inward) -->
                    <path d="M9 1v4h4"/><path d="M5 13V9H1"/><path d="M13 5l-4-4"/><path d="M1 9l4 4"/>
                  {:else}
                    <!-- Expand icon (arrows outward) -->
                    <path d="M9 5V1h4"/><path d="M5 9v4H1"/><path d="M13 1l-4 4"/><path d="M1 13l4-4"/>
                  {/if}
                </svg>
              </button>
            </div>
          {/if}
          <div class="ripple-widget-body">
            <NodeRenderer node={node} />
          </div>
        </div>
      </div>
    {/each}
  </div>

  {#if manager.spec.widgets.length === 0}
    <div class="ripple-dashboard-empty">
      <p>No widgets yet. Ask the agent to add some.</p>
    </div>
  {/if}
</div>

<style>
  .ripple-dashboard {
    width: 100%;
    min-height: 200px;
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .ripple-dashboard--mounted { opacity: 1; }

  .ripple-dashboard-header { margin-bottom: 16px; }
  .ripple-dashboard-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255,255,255,0.90);
    margin: 0;
  }
  .ripple-dashboard-desc {
    font-size: 12px;
    color: rgba(255,255,255,0.45);
    margin: 4px 0 0;
  }

  /* ========== Grid Mode (default) ========== */
  .ripple-grid {
    display: grid;
    grid-template-columns: repeat(var(--dashboard-columns, 3), 1fr);
    gap: var(--dashboard-gap, 10px);
  }
  @media (max-width: 768px) {
    .ripple-grid { grid-template-columns: 1fr; }
  }
  @media (min-width: 769px) and (max-width: 1024px) {
    .ripple-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ========== Masonry Mode ========== */
  .ripple-masonry {
    columns: 3 200px;
    column-gap: var(--masonry-gap, 10px);
  }
  @media (max-width: 600px) {
    .ripple-masonry { columns: 1; }
  }
  @media (min-width: 601px) and (max-width: 900px) {
    .ripple-masonry { columns: 2 200px; }
  }

  /* ========== Cells ========== */
  .ripple-masonry > .ripple-dashboard-cell {
    break-inside: avoid;
    margin-bottom: var(--masonry-gap, 10px);
  }

  /* Expanded cell spans all columns in masonry */
  .ripple-masonry > .ripple-cell--expanded {
    column-span: all;
  }

  /* ========== Widget Card ========== */
  .ripple-widget-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.15s, box-shadow 0.15s, max-height 0.3s ease;
    height: 100%;
  }
  .ripple-widget-card:hover {
    border-color: rgba(255,255,255,0.14);
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .ripple-widget-card--expanded {
    border-color: rgba(255,255,255,0.16);
    box-shadow: 0 6px 30px rgba(0,0,0,0.2);
  }

  /* ========== Widget Header ========== */
  .ripple-widget-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 10px;
  }
  .ripple-widget-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 1;
  }

  /* ========== Grip Handle ========== */
  .ripple-grip-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 20px;
    padding: 0;
    border: none;
    background: none;
    color: rgba(255,255,255,0.30);
    cursor: grab;
    flex-shrink: 0;
    border-radius: 3px;
    transition: color 0.12s, background 0.12s;
  }
  .ripple-grip-handle:hover {
    color: rgba(255,255,255,0.60);
    background: rgba(255,255,255,0.06);
  }
  .ripple-grip-handle:active { cursor: grabbing; }

  /* ========== Expand Button ========== */
  .ripple-expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
    color: rgba(255,255,255,0.30);
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 4px;
    transition: color 0.12s, background 0.12s;
  }
  .ripple-expand-btn:hover {
    color: rgba(255,255,255,0.70);
    background: rgba(255,255,255,0.08);
  }

  .ripple-widget-body { flex: 1; min-height: 0; }

  .ripple-dashboard-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 12px;
    color: rgba(255,255,255,0.30);
    font-size: 13px;
  }
</style>
