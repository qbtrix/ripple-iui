<!-- discover/DiscoverSkeleton.svelte — the Discover loading state in the exact
     geometry of what replaces it: skeleton rows in the bordered list for the list
     view, tile skeletons (16:9 picture, title bar, line bar) in the grid
     otherwise. One role="status" wrapper carries the label; the shapes are
     decorative. Classes are paw-enterprise's Skeleton and TemplateTileSkeleton. -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { GRID_CLASS, LIST_CLASS, type DiscoverView } from './layout.js';

  let {
    view = 'grid',
    count = 8,
    label = 'Loading Discover',
    class: className,
  }: {
    view?: DiscoverView;
    count?: number;
    label?: string;
    class?: string;
  } = $props();

  const slots = $derived(Array.from({ length: Math.max(0, count) }, (_, i) => i));
  const bone = 'bg-accent animate-pulse';
</script>

<div class={className} role="status" aria-label={label} data-testid="discover-loading">
  {#if view === 'list'}
    <div class={LIST_CLASS}>
      {#each slots as i (i)}
        <div class="flex items-center gap-4 px-3 py-2.5">
          <div data-slot="skeleton" class={cn(bone, 'aspect-video w-24 shrink-0 rounded-lg')}></div>
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div data-slot="skeleton" class={cn(bone, 'h-4 w-1/3 rounded-md')}></div>
            <div data-slot="skeleton" class={cn(bone, 'h-3 w-2/3 rounded-md')}></div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class={GRID_CLASS}>
      {#each slots as i (i)}
        <div class="flex flex-col gap-3" aria-hidden="true">
          <div data-slot="skeleton" class={cn(bone, 'aspect-video w-full rounded-2xl')}></div>
          <div data-slot="skeleton" class={cn(bone, 'h-4 w-2/3 rounded-md')}></div>
          <div data-slot="skeleton" class={cn(bone, 'h-3 w-full rounded-md')}></div>
        </div>
      {/each}
    </div>
  {/if}
</div>
