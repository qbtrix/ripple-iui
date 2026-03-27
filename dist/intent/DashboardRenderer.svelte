<!--
  DashboardRenderer.svelte — Renders intent='dashboard' specs via GridStack.
  Created: 2026-03-27 — Ported from ocean-flow DashboardRenderer with Ripple widget system.
  Updated: 2026-03-27 — GridStack.js for layout. Debug logging on all events.
  GridStack owns layout (drag/resize/arrange), Svelte owns widget content rendering.
  DO NOT sync GridStack changes back to Svelte state — causes DOM destruction.
-->
<script lang="ts">
  import { setContext, onMount, onDestroy, tick } from 'svelte';
  import { GridStack } from 'gridstack';
  import 'gridstack/dist/gridstack.min.css';
  import type { UniversalSpec } from '../schema/universal-spec.js';
  import { createDashboardManager, type DashboardSpec, type DashboardWidget } from './dashboard-manager.svelte.js';
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

  const manager = createDashboardManager();

  let lastLoadedRevision = 0;
  $effect(() => {
    const ds = dashboardSpec;
    if (manager.revision > lastLoadedRevision) {
      lastLoadedRevision = manager.revision;
      return;
    }
    manager.load(ds);
    lastLoadedRevision = manager.revision;
  });

  $effect(() => {
    if (onSpecChanged) {
      manager.onChange(onSpecChanged);
    }
  });

  setContext('dashboard-manager', manager);

  /** Map widget size to GridStack w (column span). */
  function getW(widget: DashboardWidget): number {
    if (widget.span) return widget.span;
    switch (widget.size) {
      case 'sm': return 1;
      case 'md': return 2;
      case 'lg': return 3;
      case 'xl': case 'full': return dashboardSpec.layout?.columns ?? 3;
      default: return 1;
    }
  }

  /** Map widget type to a reasonable default height. */
  function getH(widget: DashboardWidget): number {
    switch (widget.type) {
      case 'chart': return 3;
      case 'table': return 3;
      case 'feed': return 3;
      case 'terminal': return 3;
      case 'metric': return 1;
      case 'flex': return 2;
      default: return 2;
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
            node.children = widget.data.map((s: any) => ({
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

  // --- GridStack ---
  let gridEl: HTMLDivElement;
  let grid: GridStack | null = null;
  let mounted = $state(false);

  const DBG = '[DashboardRenderer]';

  onMount(async () => {
    await tick();
    const cols = dashboardSpec.layout?.columns ?? 3;
    const gap = dashboardSpec.layout?.gap ?? 10;
    console.log(DBG, 'mount — widgets:', manager.spec.widgets.length, 'cols:', cols, 'gap:', gap);

    grid = GridStack.init({
      column: cols,
      cellHeight: 80,
      margin: gap,
      animate: true,
      float: false,
      removable: false,
      disableOneColumnMode: false,
      handle: '.gs-grip-handle',
      resizable: { handles: 'e,se,s,sw,w' },
    }, gridEl);

    const itemCount = gridEl.querySelectorAll('.grid-stack-item').length;
    console.log(DBG, 'GridStack init done — DOM items:', itemCount, 'grid engine nodes:', grid.getGridItems().length);

    // Debug: log all GridStack events
    grid.on('dragstart', (_e: Event, el: any) => {
      console.log(DBG, 'dragstart —', el?.getAttribute?.('gs-id') ?? 'unknown');
    });
    grid.on('dragstop', (_e: Event, el: any) => {
      console.log(DBG, 'dragstop —', el?.getAttribute?.('gs-id') ?? 'unknown');
      // Log final layout
      const saved = grid?.save(false);
      console.log(DBG, 'layout after drag:', saved);
    });
    grid.on('resizestart', (_e: Event, el: any) => {
      console.log(DBG, 'resizestart —', el?.getAttribute?.('gs-id') ?? 'unknown');
    });
    grid.on('resizestop', (_e: Event, el: any) => {
      console.log(DBG, 'resizestop —', el?.getAttribute?.('gs-id') ?? 'unknown');
      const saved = grid?.save(false);
      console.log(DBG, 'layout after resize:', saved);
    });
    grid.on('change', (_e: Event, items: any) => {
      // DO NOT sync back to manager — GridStack owns layout, Svelte owns content.
      // Syncing causes Svelte to re-render → destroys GridStack's DOM → blank screen.
      console.log(DBG, 'change — items affected:', items?.length ?? 0,
        items?.map?.((i: any) => `${i.id}[${i.x},${i.y} ${i.w}x${i.h}]`) ?? []);
    });
    grid.on('removed', (_e: Event, items: any) => {
      console.warn(DBG, '⚠ removed event fired!', items?.length, 'items — this should NOT happen');
    });

    requestAnimationFrame(() => { mounted = true; });
  });

  onDestroy(() => {
    console.log(DBG, 'destroy');
    grid?.destroy(false);
    grid = null;
  });

  // Debug: watch for Svelte re-renders wiping the grid
  $effect(() => {
    const widgetIds = manager.spec.widgets.map(w => w.id);
    console.log(DBG, '$effect — manager.spec.widgets changed:', widgetIds.length, 'widgets', widgetIds);
    // If grid already exists and Svelte re-rendered, GridStack needs to know
    if (grid && gridEl) {
      const domItems = gridEl.querySelectorAll('.grid-stack-item').length;
      const engineItems = grid.getGridItems().length;
      console.log(DBG, '$effect — DOM items:', domItems, 'engine items:', engineItems);
      if (domItems !== engineItems) {
        console.warn(DBG, '⚠ DOM/engine mismatch! Svelte re-render likely wiped GridStack layout');
      }
    }
  });
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

  <div bind:this={gridEl} class="grid-stack">
    {#each manager.spec.widgets as widget (widget.id)}
      {@const node = widgetToNode(widget)}
      {@const widgetColor = widget.props?.color}
      <div class="grid-stack-item" gs-id={widget.id} gs-w={getW(widget)} gs-h={getH(widget)}>
        <div class="grid-stack-item-content ripple-widget-card">
          {#if widget.title}
            <div class="ripple-widget-header" style={widgetColor ? `border-left: 3px solid ${widgetColor}; padding-left: 9px;` : ''}>
              <button class="gs-grip-handle" aria-label="Drag to reorder">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" opacity="0.35">
                  <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                  <circle cx="2" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
                  <circle cx="2" cy="10" r="1.2"/><circle cx="8" cy="10" r="1.2"/>
                  <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                </svg>
              </button>
              <span class="ripple-widget-title">{widget.title}</span>
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

  /* ========== GridStack Overrides (dark theme) ========== */
  :global(.grid-stack) {
    min-height: 200px;
  }
  :global(.grid-stack-item) {
    /* Override gridstack default border */
  }
  :global(.grid-stack-placeholder > .placeholder-content) {
    background: rgba(255,255,255,0.06) !important;
    border: 1px dashed rgba(255,255,255,0.20) !important;
    border-radius: 10px !important;
  }

  /* ========== Widget Card ========== */
  .ripple-widget-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.12s, box-shadow 0.15s;
    height: 100%;
    overflow: hidden;
  }
  .ripple-widget-card:hover {
    border-color: rgba(255,255,255,0.14);
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }

  /* ========== Widget Header ========== */
  .ripple-widget-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 10px;
    flex-shrink: 0;
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
  :global(.gs-grip-handle) {
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
  :global(.gs-grip-handle:hover) {
    color: rgba(255,255,255,0.60);
    background: rgba(255,255,255,0.06);
  }
  :global(.gs-grip-handle:active) { cursor: grabbing; }

  .ripple-widget-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

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

  /* GridStack resize handle styling */
  :global(.grid-stack-item > .ui-resizable-handle) {
    opacity: 0;
    transition: opacity 0.15s;
  }
  :global(.grid-stack-item:hover > .ui-resizable-handle) {
    opacity: 0.5;
  }
  :global(.ui-resizable-se) {
    width: 12px !important;
    height: 12px !important;
    border-right: 2px solid rgba(255,255,255,0.3) !important;
    border-bottom: 2px solid rgba(255,255,255,0.3) !important;
    border-radius: 0 0 4px 0;
    background: none !important;
  }
</style>
