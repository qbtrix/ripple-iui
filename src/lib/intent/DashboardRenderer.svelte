<!--
  DashboardRenderer.svelte — Renders intent='dashboard' specs as a mutable widget grid.
  Created: 2026-03-27 — Ported from ocean-flow DashboardRenderer with Ripple widget system.
  Features: auto-grid layout, widget cards with headers, drag-to-reorder via Swapy,
  spec mutation via DashboardManager context, stagger animations.
-->
<script lang="ts">
  import { getContext, setContext, onMount, onDestroy } from 'svelte';
  import type { UniversalSpec } from '../schema/universal-spec.js';
  import { createDashboardManager, type DashboardSpec, type DashboardWidget } from './dashboard-manager.svelte.js';
  import NodeRenderer from '../components/NodeRenderer.svelte';
  import { getWidget } from '../widgets/index.js';

  interface Props {
    spec: UniversalSpec;
    onSpecChanged?: (spec: DashboardSpec) => void;
  }

  let { spec, onSpecChanged }: Props = $props();

  // Extract dashboard config from the UniversalSpec
  let dashboardSpec = $derived.by((): DashboardSpec => {
    const widgets: DashboardWidget[] = (spec as any).widgets ?? [];
    const layout = (spec as any).dashboard_layout ?? {
      type: 'grid' as const,
      columns: (spec.display?.columns ?? 3),
      gap: 10,
    };
    return { widgets, layout };
  });

  // Create the dashboard manager for mutations
  const manager = createDashboardManager();

  // Sync manager when spec changes externally
  $effect(() => {
    manager.load(dashboardSpec);
  });

  // Emit changes to parent
  $effect(() => {
    if (onSpecChanged) {
      manager.onChange(onSpecChanged);
    }
  });

  // Expose manager via context so child components can mutate
  setContext('dashboard-manager', manager);

  // Grid column classes based on widget size/span
  function getSizeClass(widget: DashboardWidget): string {
    if (widget.span) {
      if (widget.span >= 3) return 'col-span-full';
      if (widget.span === 2) return 'col-span-1 sm:col-span-2';
      return 'col-span-1';
    }
    switch (widget.size) {
      case 'sm': return 'col-span-1';
      case 'md': return 'col-span-1 sm:col-span-1 lg:col-span-2';
      case 'lg': return 'col-span-1 sm:col-span-2 lg:col-span-3';
      case 'xl': case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  }

  /** Convert a DashboardWidget to a UINode for NodeRenderer. */
  function widgetToNode(widget: DashboardWidget): any {
    // If widget has children (raw UINode tree), use those
    if (widget.children && widget.children.length > 0) {
      return {
        type: 'container',
        children: widget.children,
      };
    }

    // Otherwise, build a UINode from widget type + props + data
    const node: any = {
      type: widget.type,
      props: { ...widget.props },
    };

    // Map dashboard-specific data to widget props
    if (widget.data !== undefined) {
      if (widget.type === 'chart') {
        node.props.data = widget.data;
      } else if (widget.type === 'table') {
        node.props.data = widget.data;
      } else if (widget.type === 'metric') {
        // Metric data might be { value, label, trend, description }
        if (typeof widget.data === 'object') {
          node.props = { ...node.props, ...widget.data };
        }
      } else if (widget.type === 'feed') {
        node.props.items = widget.data;
      } else if (widget.type === 'text') {
        node.props.text = typeof widget.data === 'string' ? widget.data : JSON.stringify(widget.data);
      } else {
        // Generic: pass data as-is
        node.props.data = widget.data;
      }
    }

    // Add title prop if widget type supports it
    if (widget.title && !node.props.title) {
      node.props.title = widget.title;
    }

    return node;
  }

  let visible = $state(false);
  onMount(() => { requestAnimationFrame(() => { visible = true; }); });
</script>

<div class="ripple-dashboard" class:ripple-dashboard-visible={visible}>
  <!-- Title -->
  {#if spec.title}
    <div class="ripple-dashboard-header">
      <h2 class="ripple-dashboard-title">{spec.title}</h2>
      {#if spec.description}
        <p class="ripple-dashboard-desc">{spec.description}</p>
      {/if}
    </div>
  {/if}

  <!-- Widget Grid -->
  <div
    class="ripple-dashboard-grid"
    style="--dashboard-columns:{dashboardSpec.layout?.columns ?? 3};--dashboard-gap:{dashboardSpec.layout?.gap ?? 10}px"
  >
    {#each manager.spec.widgets as widget, wi (widget.id)}
      {@const node = widgetToNode(widget)}
      {@const WidgetComponent = getWidget(widget.type)}
      <div
        class="ripple-dashboard-cell {getSizeClass(widget)}"
        style="animation-delay:{wi * 60}ms"
      >
        <div class="ripple-widget-card">
          {#if widget.title}
            <div class="ripple-widget-header">
              <span class="ripple-widget-title">{widget.title}</span>
            </div>
          {/if}
          <div class="ripple-widget-body">
            {#if WidgetComponent}
              <NodeRenderer node={node} />
            {:else}
              <!-- Fallback: try NodeRenderer which does its own lookup -->
              <NodeRenderer node={node} />
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Empty state -->
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
  .ripple-dashboard-visible { opacity: 1; }

  .ripple-dashboard-header {
    margin-bottom: 16px;
  }
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

  .ripple-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(var(--dashboard-columns, 3), 1fr);
    gap: var(--dashboard-gap, 10px);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .ripple-dashboard-grid { grid-template-columns: 1fr; }
  }
  @media (min-width: 769px) and (max-width: 1024px) {
    .ripple-dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .ripple-dashboard-cell {
    animation: widget-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .col-span-1 { grid-column: span 1; }
  :global(.ripple-dashboard-cell.col-span-full) { grid-column: 1 / -1; }

  @keyframes widget-enter {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ripple-widget-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.12s, box-shadow 0.15s;
    height: 100%;
  }
  .ripple-widget-card:hover {
    border-color: rgba(255,255,255,0.14);
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }

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

  .ripple-widget-body {
    flex: 1;
    min-height: 0;
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

  /* Responsive col-span classes */
  @media (min-width: 640px) {
    :global(.ripple-dashboard-cell.sm\:col-span-2) { grid-column: span 2; }
  }
  @media (min-width: 1024px) {
    :global(.ripple-dashboard-cell.lg\:col-span-2) { grid-column: span 2; }
    :global(.ripple-dashboard-cell.lg\:col-span-3) { grid-column: span 3; }
  }
</style>
