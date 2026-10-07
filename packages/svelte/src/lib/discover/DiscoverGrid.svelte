<!-- discover/DiscoverGrid.svelte — the container a run of Discover items sits in,
     by view: an auto-fill grid of tiles, a sideways-scrolling shelf, or a bordered
     list of rows (role="list"; DiscoverRow is the listitem). The consumer renders
     DiscoverTile for grid and shelves, DiscoverRow for list. The shelf sizes its
     children (w-64, snap) itself and bleeds into a px-6 page gutter. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { GRID_CLASS, LIST_CLASS, SHELF_CLASS, type DiscoverView } from './layout.js';

  let {
    view = 'grid',
    label,
    class: className,
    children,
  }: {
    view?: DiscoverView;
    /** Names the list or the shelf for assistive tech; the grid takes none. */
    label?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

{#if view === 'list'}
  <div class={cn(LIST_CLASS, className)} role="list" aria-label={label}>{@render children()}</div>
{:else if view === 'shelves'}
  <div class={cn(SHELF_CLASS, className)} aria-label={label ? `${label}, scroll sideways for more` : undefined}>{@render children()}</div>
{:else}
  <div class={cn(GRID_CLASS, className)}>{@render children()}</div>
{/if}
