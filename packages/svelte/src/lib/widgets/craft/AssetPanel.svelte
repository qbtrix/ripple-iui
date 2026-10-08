<!--
  widgets/craft/AssetPanel.svelte
  The Quick mode library on the left of a craft editor: a vertical rail of tabs
  the host chooses (Templates, Elements, Text, Brand, Uploads) and a flyout with
  that tab's search, filter chips and a thumbnail grid. On `./ui` only.

  - `items` maps tab id to its items; `undefined` means still loading (skeleton
    tiles), `[]` means empty (EmptyState). Search and chips are kept per tab and
    filter locally (`filterAssets`); set `filter={false}` and answer `onsearch` /
    `onfilter` to search on the server instead.
  - A tile inserts on click (`oninsert`) and drags onto a canvas: the drag
    carries an AssetDrop under ASSET_MIME (asset-panel.ts), read back with
    `readAssetDrop`. Images are lazy; the tile keeps the item's aspect ratio.
  - Collapsible to the rail: the chevron button, or clicking the open tab
    again. Clicking any tab while collapsed opens it. `collapsed` is bindable.
  - Rail: role="tablist" (vertical, roving tabindex, Up/Down/Home/End select).
    Grid: one tab stop; arrows move between tiles, Enter inserts.
  - Big targets and visible labels, since its people are not designers: filter
    chips wrap (no hidden sideways scroller) and captions take up to two lines
    (bilingual names), marked `data-wrap-ok` for layout checkers.
  Reuses Search (mode="filter"), EmptyState and Icon. Tokens only.
-->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import Search from '../input/Search.svelte';
  import EmptyState from '../display/EmptyState.svelte';
  import Icon from '../display/Icon.svelte';
  import ChevronsLeftIcon from '@lucide/svelte/icons/chevrons-left';
  import ChevronsRightIcon from '@lucide/svelte/icons/chevrons-right';
  import { filterAssets, gridColumns, writeAssetDrag, type AssetItem, type AssetTab } from './asset-panel.js';

  interface Props {
    tabs: AssetTab[];
    /** Active tab id. Bindable; defaults to the first tab. */
    tab?: string;
    items?: Record<string, AssetItem[] | undefined>;
    /** Bindable. */
    collapsed?: boolean;
    /** Flyout width in px (the rail adds 76). */
    width?: number;
    /** Minimum tile width in px; the grid fits as many columns as it can. */
    tileWidth?: number;
    /** Filter items locally by the search box and chips. */
    filter?: boolean;
    oninsert?: (item: AssetItem, tab: string) => void;
    onsearch?: (tab: string, query: string) => void;
    onfilter?: (tab: string, chip: string | null) => void;
    ontab?: (tab: string) => void;
    icon?: Snippet<[AssetTab]>;
    /** Custom tile body (the caption still renders under it). */
    tile?: Snippet<[AssetItem, AssetTab]>;
    label?: string;
    class?: string;
  }

  let {
    tabs,
    tab = $bindable(),
    items = {},
    collapsed = $bindable(false),
    width = 320,
    tileWidth = 96,
    filter = true,
    oninsert,
    onsearch,
    onfilter,
    ontab,
    icon,
    tile,
    label = 'Library',
    class: className,
  }: Props = $props();

  const uid = $props.id();
  const tabId = (id: string) => `asset-${uid}-tab-${id}`;
  const panelId = `asset-${uid}-panel`;

  $effect.pre(() => {
    if (tabs.length && !tabs.some((t) => t.id === tab)) tab = tabs[0].id;
  });

  /* Derived, not only the effect below, so a server render already paints the first tab. */
  const current = $derived(tabs.find((t) => t.id === tab) ?? tabs[0]);
  let queries = $state<Record<string, string>>({});
  let chips = $state<Record<string, string | null>>({});
  const active = $derived(current?.id);
  const query = $derived((active && queries[active]) || '');
  const chip = $derived((active && chips[active]) || null);
  const raw = $derived(active ? items[active] : undefined);
  const shown = $derived(raw && filter ? filterAssets(raw, query, chip) : (raw ?? []));
  let focusIndex = $state(0);
  $effect(() => {
    void active;
    void query;
    void chip;
    focusIndex = 0;
  });

  let gridEl = $state<HTMLElement | null>(null);

  function choose(id: string) {
    if (id === active && !collapsed) {
      collapsed = true;
      return;
    }
    collapsed = false;
    if (id !== active) {
      tab = id;
      ontab?.(id);
    }
  }

  function onRailKey(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    tab = tabs[next].id;
    ontab?.(tab);
    document.getElementById(tabId(tab))?.focus();
  }

  function setQuery(q: string) {
    if (!active) return;
    queries[active] = q;
    onsearch?.(active, q);
  }

  function setChip(id: string | null) {
    if (!active) return;
    chips[active] = id;
    onfilter?.(active, id);
  }

  function onGridKey(e: KeyboardEvent) {
    const n = shown.length;
    if (!n || !gridEl) return;
    const cols = gridColumns(getComputedStyle(gridEl).gridTemplateColumns, gridEl.clientWidth, tileWidth);
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = focusIndex;
    if (e.key in step) next = Math.min(n - 1, Math.max(0, focusIndex + step[e.key]));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    focusIndex = next;
    gridEl.querySelectorAll<HTMLElement>('[data-asset-tile]')[next]?.focus();
  }

  const aspect = (it: AssetItem) => (it.width && it.height ? `${it.width} / ${it.height}` : '1 / 1');
</script>

<div data-slot="asset-panel" data-collapsed={collapsed || undefined} class={cn('flex h-full min-h-0', className)}>
  <div class="flex w-[76px] shrink-0 flex-col items-stretch gap-1 border-r border-ripple-border p-1">
    <div role="tablist" aria-label={label} aria-orientation="vertical" tabindex="-1" class="flex flex-col gap-1" onkeydown={onRailKey}>
      {#each tabs as t (t.id)}
        {@const selected = t.id === active}
        <button
          type="button"
          role="tab"
          id={tabId(t.id)}
          aria-selected={selected}
          aria-controls={collapsed ? undefined : panelId}
          tabindex={selected ? 0 : -1}
          onclick={() => choose(t.id)}
          class={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1.5 text-[11px] font-medium leading-tight transition-colors duration-150 ease-ripple-out focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none',
            selected && !collapsed
              ? 'bg-ripple-accent/10 text-ripple-accent'
              : 'text-ripple-muted-foreground hover:bg-ripple-muted hover:text-ripple-surface-foreground',
          )}
        >
          <span class="flex size-6 items-center justify-center" aria-hidden="true">
            {#if icon}{@render icon(t)}{:else if t.icon}<Icon name={t.icon} size={20} />{:else}{t.label[0]}{/if}
          </span>
          <span class="max-w-full truncate">{t.label}</span>
        </button>
      {/each}
    </div>
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-controls={panelId}
      aria-label={collapsed ? `Open ${label.toLowerCase()}` : `Close ${label.toLowerCase()}`}
      title={collapsed ? `Open ${label.toLowerCase()}` : `Close ${label.toLowerCase()}`}
      onclick={() => (collapsed = !collapsed)}
      class="mt-auto flex h-9 items-center justify-center rounded-lg text-ripple-muted-foreground transition-colors duration-150 ease-ripple-out hover:bg-ripple-muted hover:text-ripple-surface-foreground focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none"
    >
      {#if collapsed}<ChevronsRightIcon size={18} aria-hidden="true" />{:else}<ChevronsLeftIcon size={18} aria-hidden="true" />{/if}
    </button>
  </div>

  {#if !collapsed && current}
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId(current.id)}
      class="flex min-h-0 flex-col"
      style:width="{width}px"
    >
      <div class="flex shrink-0 flex-col gap-2.5 px-3 pt-3 pb-2">
        <h2 class="text-[15px] font-semibold text-ripple-surface-foreground">{current.label}</h2>
        {#key current.id}
          <Search
            mode="filter"
            value={query}
            placeholder={current.placeholder ?? `Search ${current.label.toLowerCase()}`}
            aria-label={current.placeholder ?? `Search ${current.label.toLowerCase()}`}
            oninput={setQuery}
            class="max-w-none"
          />
        {/key}
        {#if current.filters?.length}
          <div role="group" aria-label="Filters" class="flex flex-wrap gap-1.5 pb-0.5">
            {#each [{ id: '', label: 'All' }, ...current.filters] as f (f.id)}
              {@const on = (f.id || null) === chip}
              <button
                type="button"
                aria-pressed={on}
                onclick={() => setChip(f.id || null)}
                class={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors duration-150 ease-ripple-out focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none',
                  on
                    ? 'border-ripple-accent/40 bg-ripple-accent/10 text-ripple-accent'
                    : 'border-ripple-border text-ripple-surface-foreground hover:bg-ripple-muted',
                )}
              >
                {f.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {#if raw === undefined}
          <div aria-busy="true" class="grid gap-2" style:grid-template-columns="repeat(auto-fill, minmax({tileWidth}px, 1fr))">
            <span class="sr-only" role="status">Loading {current.label.toLowerCase()}</span>
            {#each Array(8) as _, i (i)}
              <div data-asset-skeleton class="aspect-square animate-pulse rounded-lg bg-ripple-muted motion-reduce:animate-none"></div>
            {/each}
          </div>
        {:else if shown.length === 0}
          <EmptyState
            size="sm"
            icon={query ? 'search' : 'inbox'}
            title={query ? `No results for “${query}”` : (current.emptyText ?? 'Nothing here yet')}
            description={query ? 'Try another word, in English or Hindi.' : undefined}
          />
        {:else}
          <div
            bind:this={gridEl}
            role="group"
            aria-label={current.label}
            class="grid gap-2"
            style:grid-template-columns="repeat(auto-fill, minmax({tileWidth}px, 1fr))"
          >
            {#each shown as it, i (it.id)}
              <button
                type="button"
                draggable="true"
                data-asset-tile
                tabindex={i === focusIndex ? 0 : -1}
                title={it.label}
                aria-label={current.captions === false ? it.label : undefined}
                onclick={() => oninsert?.(it, current.id)}
                onfocus={() => (focusIndex = i)}
                onkeydown={onGridKey}
                ondragstart={(e) => e.dataTransfer && writeAssetDrag(e.dataTransfer, it, current.id)}
                class="group flex min-w-0 flex-col gap-1 rounded-lg p-1 text-left transition-colors duration-150 ease-ripple-out hover:bg-ripple-muted focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none"
              >
                <span
                  class="flex w-full items-center justify-center overflow-hidden rounded-md bg-ripple-muted/60 ring-1 ring-ripple-border"
                  style:aspect-ratio={aspect(it)}
                >
                  {#if tile}
                    {@render tile(it, current)}
                  {:else if it.thumb}
                    <img src={safeUrl(it.thumb, { kind: 'resource' })} alt="" loading="lazy" decoding="async" draggable="false" class="size-full object-contain" />
                  {:else}
                    <span class="line-clamp-2 px-2 text-center text-[15px] font-semibold text-ripple-surface-foreground">{it.preview ?? it.label}</span>
                  {/if}
                </span>
                {#if current.captions !== false}
                  <span data-wrap-ok class="line-clamp-2 px-0.5 text-[12px] leading-snug text-ripple-surface-foreground/85">{it.label}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
