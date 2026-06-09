<!-- src/lib/widgets/data/VirtualList.svelte
     Modified: 2026-06-09 — a11y: added aria-selected="false" to the role="option"
     row so it has the required ARIA prop (a11y_role_has_required_aria_props). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items?: unknown[];
    /** Fixed row height in pixels. */
    itemHeight?: number;
    /** Container height (e.g. "320px" or 320 for px). */
    height?: string | number;
    /** Extra rows rendered above/below the visible window. */
    overscan?: number;
    /** Per-item template — receives `item` and `index` in loop context. */
    item?: any;
    emptyText?: string;
    children?: Snippet;
  }

  let {
    id,
    class: className,
    style,
    items: rawItems = [],
    itemHeight = 36,
    height = '320px',
    overscan = 5,
    item,
    emptyText = 'No items',
    children
  }: Props = $props();

  const items = $derived(safeArray(rawItems, { widget: 'virtual-list', key: 'items' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const containerHeight = $derived(typeof height === 'number' ? `${height}px` : height);

  let scrollTop = $state(0);
  let viewportHeight = $state(320);
  let viewportEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!viewportEl) return;
    viewportHeight = viewportEl.clientHeight;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      viewportHeight = viewportEl?.clientHeight ?? 0;
    });
    ro.observe(viewportEl);
    return () => ro.disconnect();
  });

  const total = $derived(items.length);
  const totalHeight = $derived(total * itemHeight);

  const start = $derived(Math.max(0, Math.floor(scrollTop / itemHeight) - overscan));
  const visibleCount = $derived(Math.ceil(viewportHeight / itemHeight) + overscan * 2);
  const end = $derived(Math.min(total, start + visibleCount));

  const visible = $derived.by(() => {
    const out: { item: unknown; index: number }[] = [];
    for (let i = start; i < end; i++) out.push({ item: items[i], index: i });
    return out;
  });

  const offsetY = $derived(start * itemHeight);

  function onScroll(e: Event) {
    scrollTop = (e.target as HTMLDivElement).scrollTop;
  }

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }
</script>

<div
  {id}
  bind:this={viewportEl}
  onscroll={onScroll}
  class={cn('relative overflow-auto rounded-md border border-border', className)}
  style={`height: ${containerHeight}; ${styleString ?? ''}`}
  role="listbox"
>
  {#if total === 0}
    <div class="h-full grid place-items-center text-sm text-muted-foreground">{emptyText}</div>
  {:else}
    <div style="height: {totalHeight}px; position: relative;">
      <div style="position: absolute; top: 0; left: 0; right: 0; transform: translateY({offsetY}px);">
        {#each visible as v (v.index)}
          <div style="height: {itemHeight}px;" role="option" aria-selected="false" aria-posinset={v.index + 1} aria-setsize={total}>
            {#if isSpec(item)}
              <NodeRenderer node={item} loopContext={{ item: v.item, index: v.index }} />
            {:else if children}
              {@render children()}
            {:else}
              <div class="px-3 py-2 text-sm">{String((v.item as any)?.label ?? (v.item as any)?.name ?? v.item)}</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
