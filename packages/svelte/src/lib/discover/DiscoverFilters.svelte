<!-- discover/DiscoverFilters.svelte — the Discover page's sticky type bar: the
     kind tabs on the left, the Grid / Shelves / List toggle on the right. Both
     groups draw ripple Segmented's size="sm" pill track. With callbacks the
     segments are radio buttons; when the kind options carry `href`, or
     `viewHref` is given, that group renders as links (aria-current on the
     selected one), so a server-rendered page filters with JS off. The track is
     drawn here rather than through Segmented because Segmented looks option
     icons up by name in the whole Lucide barrel (~800 KB a consumer cannot tree
     shake); the view icons here are imported one by one. The view toggle shows
     only with `onview` or `viewHref`. The bar paints bg-background; the app adds
     its glass class through `class`. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import GalleryHorizontal from '@lucide/svelte/icons/gallery-horizontal';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import List from '@lucide/svelte/icons/list';
  import { cn } from '$lib/utils.js';
  import { DISCOVER_VIEWS, type DiscoverOption, type DiscoverView } from './layout.js';

  let {
    kinds,
    kind,
    onkind,
    view = 'grid',
    onview,
    viewHref,
    class: className,
  }: {
    kinds: readonly DiscoverOption[];
    kind: string;
    onkind?: (kind: string) => void;
    view?: DiscoverView;
    onview?: (view: DiscoverView) => void;
    /** The address of each view, for a page that switches views by link. */
    viewHref?: (view: DiscoverView) => string;
    class?: string;
  } = $props();

  const VIEW_META: Record<DiscoverView, { label: string; Icon: Component }> = {
    grid: { label: 'Grid', Icon: LayoutGrid },
    shelves: { label: 'Shelves', Icon: GalleryHorizontal },
    list: { label: 'List', Icon: List },
  };

  const kindLinks = $derived(kinds.some((k) => k.href));
  const viewOptions = $derived(
    DISCOVER_VIEWS.map((v) => ({ value: v, label: VIEW_META[v].label, href: viewHref?.(v), Icon: VIEW_META[v].Icon })),
  );

  function pickView(v: string) {
    const next = DISCOVER_VIEWS.find((x) => x === v);
    if (next) onview?.(next);
  }
</script>

<!-- Segmented's size="sm" track, thumb and segment classes. With `onpick` the
     segments are radios (Segmented's own semantics); without it they are links. -->
{#snippet pills(options: readonly (DiscoverOption & { Icon?: Component })[], selected: string, onpick?: (value: string) => void)}
  {@const index = options.findIndex((o) => o.value === selected)}
  <div class="flex flex-col gap-1.5">
    <div
      role={onpick ? 'radiogroup' : undefined}
      class="relative inline-grid h-7 w-fit max-w-full overflow-x-auto rounded-full bg-ripple-border/60 p-0.5 text-[12px] select-none [scrollbar-width:none]"
      style="grid-template-columns: repeat({Math.max(1, options.length)}, 1fr);"
    >
      {#if index >= 0}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full bg-ripple-surface ring-1 ring-ripple-border transition-transform duration-200 ease-ripple-out motion-reduce:transition-none"
          style="width: calc((100% - 4px) / {Math.max(1, options.length)}); transform: translateX({index * 100}%);"
        ></span>
      {/if}
      {#each options as o (o.value)}
        {@const on = o.value === selected}
        {@const segment = cn(
          'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 font-medium whitespace-nowrap transition-colors duration-150 ease-ripple-out',
          on ? 'text-ripple-surface-foreground' : 'text-ripple-muted-foreground hover:text-ripple-surface-foreground',
        )}
        {#if onpick}
          <button type="button" role="radio" aria-checked={on} class={segment} onclick={() => onpick(o.value)}>
            {#if o.Icon}<o.Icon size={14} />{/if}
            {o.label}
          </button>
        {:else}
          <a href={o.href} aria-current={on ? 'true' : undefined} class={segment}>
            {#if o.Icon}<o.Icon size={14} />{/if}
            {o.label}
          </a>
        {/if}
      {/each}
    </div>
  </div>
{/snippet}

<div class={cn('sticky top-0 z-10 mt-6 border-b border-border bg-background', className)}>
  <div class="mx-auto flex w-full max-w-[1280px] items-center gap-3 overflow-x-auto px-6 py-2.5">
    <div role="group" aria-label="Filter by type">
      {@render pills(kinds, kind, kindLinks ? undefined : (v) => onkind?.(v))}
    </div>
    {#if viewHref || onview}
      <div class="ml-auto shrink-0" role="group" aria-label="View">
        {@render pills(viewOptions, view, viewHref ? undefined : pickView)}
      </div>
    {/if}
  </div>
</div>
