<!--
  DashboardRenderer.svelte — Renders intent='dashboard' specs via Muuri.
  Created: 2026-03-27 — Ported from ocean-flow DashboardRenderer with Ripple widget system.
  Updated: 2026-03-27 — Muuri for layout/drag/resize. Exposes autoArrange() via context.
  Updated: 2026-03-30 — Added remove (×) button on widget headers. Appears on hover, calls manager.removeWidget().
-->
<script lang="ts">
  import { setContext, onMount, onDestroy, tick } from 'svelte';
  import type MuuriType from 'muuri';
  import type { UniversalSpec } from '../schema/universal-spec.js';
  import { createDashboardManager, type DashboardSpec, type DashboardWidget } from './dashboard-manager.svelte.js';
  import NodeRenderer from '../components/NodeRenderer.svelte';

  interface Props {
    spec: UniversalSpec;
    onSpecChanged?: (spec: DashboardSpec) => void;
  }

  let { spec, onSpecChanged }: Props = $props();

  let dashboardSpec = $derived.by((): DashboardSpec => {
    const rawWidgets: DashboardWidget[] = (spec as any).widgets ?? [];
    // Deduplicate widget IDs — AI-generated specs can have collisions
    const seen = new Set<string>();
    const widgets = rawWidgets.map((w, i) => {
      let id = w.id ?? `w-${i}`;
      if (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return { ...w, id };
    });
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

  function sizeClass(widget: DashboardWidget): string {
    const s = widget.size ?? 'sm';
    if (widget.span) {
      const cols = dashboardSpec.layout?.columns ?? 3;
      if (widget.span >= cols) return 'muuri-w-full';
      if (widget.span >= 2) return 'muuri-w-md';
    }
    switch (s) {
      case 'lg': case 'xl': case 'full': return 'muuri-w-full';
      case 'md': return 'muuri-w-md';
      default: return 'muuri-w-sm';
    }
  }

  /** Fit each .muuri-item height to its content's actual rendered height. */
  function fitItemsToContent() {
    if (!gridEl) return;
    gridEl.querySelectorAll<HTMLElement>('.muuri-item').forEach((item) => {
      // Only auto-fit if no manual resize (no inline height set)
      if (item.style.height) return;
      const content = item.querySelector<HTMLElement>('.muuri-item-content');
      if (!content) return;
      // Temporarily remove height constraint to measure natural height
      const prevMinH = item.style.minHeight;
      item.style.minHeight = '0';
      item.style.height = 'auto';
      const naturalH = content.scrollHeight + 10; // 10 = padding from .muuri-item
      const minH = 80;
      item.style.height = `${Math.max(naturalH, minH)}px`;
      item.style.minHeight = prevMinH;
    });
  }

  function initResize(e: PointerEvent, itemEl: HTMLElement) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = itemEl.offsetWidth;
    const startH = itemEl.offsetHeight;

    const onMove = (ev: PointerEvent) => {
      const newW = Math.max(160, startW + ev.clientX - startX);
      const newH = Math.max(80, startH + ev.clientY - startY);
      itemEl.style.width = `${newW}px`;
      itemEl.style.height = `${newH}px`;
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      muuriGrid?.refreshItems().layout();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // --- Widget menu ---
  let openMenuId = $state<string | null>(null);

  function closeMenu(e: MouseEvent) {
    if (openMenuId && !(e.target as HTMLElement)?.closest('.ripple-widget-menu-wrap')) {
      openMenuId = null;
    }
  }

  // --- Muuri ---
  let gridEl: HTMLDivElement;
  let muuriGrid: any = null;
  let mounted = $state(false);

  /** Reset all custom sizes, fit to content, sort by area, and re-pack. */
  function autoArrange() {
    if (!muuriGrid || !gridEl) return;
    // Clear any manually-set inline widths/heights from resize
    gridEl.querySelectorAll<HTMLElement>('.muuri-item').forEach((el) => {
      el.style.width = '';
      el.style.height = '';
    });
    // Fit each item to its actual content height
    fitItemsToContent();
    // Refresh dimensions then sort biggest-first for optimal packing
    muuriGrid.refreshItems();
    muuriGrid.sort((a: any, b: any) => {
      const aEl = a.getElement();
      const bEl = b.getElement();
      const aArea = aEl.offsetWidth * aEl.offsetHeight;
      const bArea = bEl.offsetWidth * bEl.offsetHeight;
      return bArea - aArea;
    });
  }

  // Expose autoArrange via context and DOM event listener
  setContext('dashboard-actions', { autoArrange });

  onMount(async () => {
    await tick();

    const { default: Muuri } = await import('muuri');
    muuriGrid = new Muuri(gridEl, {
      items: '.muuri-item',
      dragEnabled: true,
      dragHandle: '.muuri-grip',
      dragSort: true,
      dragStartPredicate: { distance: 5 },
      dragPlaceholder: {
        enabled: true,
        createElement: () => {
          const el = document.createElement('div');
          el.classList.add('muuri-placeholder');
          return el;
        },
      },
      dragRelease: {
        duration: 250,
        easing: 'ease-out',
      },
      dragSortHeuristics: {
        sortInterval: 50,
      },
      layout: {
        fillGaps: true,
        rounding: false,
      },
      layoutDuration: 300,
      layoutEasing: 'cubic-bezier(0.2, 0, 0, 1)',
      layoutOnResize: 150,
    });

    // Listen for auto-arrange events from parent
    gridEl.closest('.widget-canvas')?.addEventListener('dashboard:auto-arrange', autoArrange);

    // After content renders: fit items to content, then let Muuri layout
    requestAnimationFrame(() => {
      fitItemsToContent();
      muuriGrid.refreshItems().layout();
      mounted = true;
    });
  });

  // Sync Muuri when widgets are added/removed
  $effect(() => {
    const _rev = manager.revision; // track changes
    if (!muuriGrid || !gridEl) return;
    // Let Svelte update the DOM first, then sync Muuri
    tick().then(() => {
      if (!muuriGrid || !gridEl) return;
      const currentIds = new Set(manager.spec.widgets.map(w => w.id));
      // Remove Muuri items that no longer exist in spec
      const muuriItems = muuriGrid.getItems();
      const toRemove = muuriItems.filter((item: any) => {
        const el = item.getElement();
        const id = el?.getAttribute('data-widget-id');
        return id && !currentIds.has(id);
      });
      if (toRemove.length > 0) {
        muuriGrid.remove(toRemove, { removeElements: false });
      }
      // Add new DOM elements that Muuri doesn't know about
      const knownEls = new Set(muuriItems.map((item: any) => item.getElement()));
      const newEls = Array.from(gridEl.querySelectorAll('.muuri-item')).filter(
        (el) => !knownEls.has(el)
      );
      if (newEls.length > 0) {
        muuriGrid.add(newEls as HTMLElement[]);
      }
      fitItemsToContent();
      muuriGrid.refreshItems().layout();
    });
  });

  onDestroy(() => {
    gridEl?.closest('.widget-canvas')?.removeEventListener('dashboard:auto-arrange', autoArrange);
    muuriGrid?.destroy();
    muuriGrid = null;
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="ripple-dashboard" class:ripple-dashboard--mounted={mounted} onclick={closeMenu}>
  <div bind:this={gridEl} class="muuri-grid">
    {#each manager.spec.widgets as widget (widget.id)}
      {@const node = widgetToNode(widget)}
      {@const widgetColor = widget.props?.color}
      <div class="muuri-item {sizeClass(widget)}" data-widget-id={widget.id}>
        <div class="muuri-item-content ripple-widget-card">
          {#if widget.title}
            <div class="ripple-widget-header" style={widgetColor ? `border-left: 3px solid ${widgetColor}; padding-left: 9px;` : ''}>
              <button class="muuri-grip" aria-label="Drag to reorder">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" opacity="0.35">
                  <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                  <circle cx="2" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
                  <circle cx="2" cy="10" r="1.2"/><circle cx="8" cy="10" r="1.2"/>
                  <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                </svg>
              </button>
              <span class="ripple-widget-title">{widget.title}</span>
              <div class="ripple-widget-menu-wrap">
                <button
                  class="ripple-widget-menu-btn"
                  aria-label="Widget options"
                  onclick={(e) => {
                    e.stopPropagation();
                    openMenuId = openMenuId === widget.id ? null : widget.id;
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="6" cy="2.5" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="9.5" r="1.2"/>
                  </svg>
                </button>
                {#if openMenuId === widget.id}
                  <div class="ripple-widget-dropdown">
                    <button class="ripple-widget-dropdown-item" onclick={(e) => {
                      e.stopPropagation();
                      const item = (e.currentTarget as HTMLElement).closest('.muuri-item') as HTMLElement;
                      if (item) initResize(e as any, item);
                      openMenuId = null;
                    }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M10 4.5L7.5 2M2 10l2.5-2.5M5 2H2v3M10 7v3H7"/></svg>
                      Resize
                    </button>
                    <button class="ripple-widget-dropdown-item" onclick={(e) => {
                      e.stopPropagation();
                      // Cycle size: sm → md → lg → sm
                      const cur = widget.size ?? 'sm';
                      const next = cur === 'sm' ? 'md' : cur === 'md' ? 'lg' : 'sm';
                      manager.updateWidget(widget.id, { size: next });
                      openMenuId = null;
                    }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="1" y="1" width="10" height="10" rx="2"/><path d="M1 6h10"/></svg>
                      {widget.size === 'sm' ? 'Make wider' : widget.size === 'lg' ? 'Make smaller' : 'Make full'}
                    </button>
                    <div class="ripple-widget-dropdown-sep"></div>
                    <button class="ripple-widget-dropdown-item ripple-widget-dropdown-danger" onclick={(e) => {
                      e.stopPropagation();
                      manager.removeWidget(widget.id);
                      openMenuId = null;
                    }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3"/></svg>
                      Remove
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
          <div class="ripple-widget-body">
            <NodeRenderer node={node} />
          </div>
          <div
            class="muuri-resize-handle"
            role="separator"
            aria-label="Resize widget"
            onpointerdown={(e) => {
              const item = (e.currentTarget as HTMLElement).closest('.muuri-item') as HTMLElement;
              if (item) initResize(e, item);
            }}
          ></div>
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

  /* ========== Muuri Grid ========== */
  .muuri-grid {
    position: relative;
    width: 100%;
    min-height: 200px;
  }

  :global(.muuri-item) {
    position: absolute;
    display: block;
    z-index: 1;
    padding: 5px;
    box-sizing: border-box;
  }
  :global(.muuri-item.muuri-item-dragging) { z-index: 10; }
  :global(.muuri-item.muuri-item-releasing) { z-index: 2; }
  :global(.muuri-item.muuri-item-hidden) { z-index: 0; }

  /* Width presets */
  :global(.muuri-w-sm) { width: 33.333%; }
  :global(.muuri-w-md) { width: 50%; }
  :global(.muuri-w-full) { width: 100%; }

  /* Responsive */
  @media (max-width: 600px) {
    :global(.muuri-w-sm),
    :global(.muuri-w-md),
    :global(.muuri-w-full) { width: 100%; }
  }
  @media (min-width: 601px) and (max-width: 900px) {
    :global(.muuri-w-sm) { width: 50%; }
    :global(.muuri-w-md) { width: 50%; }
  }

  :global(.muuri-item-content) {
    width: 100%;
    height: 100%;
  }

  :global(.muuri-placeholder) {
    background: rgba(255,255,255,0.06);
    border: 1px dashed rgba(255,255,255,0.20);
    border-radius: 10px;
    width: 100%;
    height: 100%;
  }

  /* ========== Widget Card ========== */
  .ripple-widget-card {
    position: relative;
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

  /* Widget 3-dot menu */
  .ripple-widget-menu-wrap {
    position: relative;
  }
  .ripple-widget-menu-btn {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 5px;
    border: none; background: none;
    color: rgba(255,255,255,0.20);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s, color 0.12s, background 0.12s;
  }
  .ripple-widget-card:hover .ripple-widget-menu-btn { opacity: 1; }
  .ripple-widget-menu-btn:hover {
    color: rgba(255,255,255,0.60);
    background: rgba(255,255,255,0.08);
  }
  .ripple-widget-dropdown {
    position: absolute; top: calc(100% + 4px); right: 0; z-index: 50;
    min-width: 160px;
    background: rgba(30,30,28,0.97);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 9px;
    box-shadow: 0 10px 36px rgba(0,0,0,0.50);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 3px;
    display: flex; flex-direction: column;
  }
  .ripple-widget-dropdown-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: 6px;
    font-size: 11.5px; font-weight: 500; font-family: inherit;
    color: rgba(255,255,255,0.70);
    background: none; border: none;
    cursor: pointer; text-align: left; white-space: nowrap;
    transition: background 0.1s, color 0.1s;
  }
  .ripple-widget-dropdown-item:hover {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.90);
  }
  .ripple-widget-dropdown-sep {
    height: 1px; background: rgba(255,255,255,0.06);
    margin: 2px 6px;
  }
  .ripple-widget-dropdown-danger { color: rgba(255,69,58,0.70); }
  .ripple-widget-dropdown-danger:hover {
    color: #FF453A;
    background: rgba(255,69,58,0.10);
  }

  :global(.muuri-grip) {
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
  :global(.muuri-grip:hover) {
    color: rgba(255,255,255,0.60);
    background: rgba(255,255,255,0.06);
  }
  :global(.muuri-grip:active) { cursor: grabbing; }

  .ripple-widget-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  /* ========== Resize Handle ========== */
  .muuri-resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 5;
  }
  .muuri-resize-handle::after {
    content: '';
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-right: 2px solid rgba(255,255,255,0.3);
    border-bottom: 2px solid rgba(255,255,255,0.3);
    border-radius: 0 0 2px 0;
  }
  :global(.muuri-item:hover) .muuri-resize-handle {
    opacity: 1;
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
</style>
