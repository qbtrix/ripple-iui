<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount, onDestroy } from 'svelte';
  import { cn } from '../../utils.js';
  // Swapy removed — this legacy Dashboard widget is replaced by DashboardRenderer (Muuri)
  // Dynamic import so it doesn't break when swapy isn't installed
  let createSwapyFn: any = null;

  interface Props {
    id?: string;
    class?: string;
    children?: Snippet;
    /** Min column width — grid auto-fills based on container */
    columnMin?: string;
    gap?: string;
    /** Enable drag-to-swap */
    swappable?: boolean;
    /** Called when items are swapped */
    onswap?: (event: { data: { array: { slot: string; item: string }[] } }) => void;
  }

  let {
    id, class: className, children,
    columnMin = '240px', gap = '12px',
    swappable = true, onswap
  }: Props = $props();

  let containerEl: HTMLDivElement;
  let swapyInstance: any = null;

  onMount(async () => {
    if (swappable && containerEl) {
      try {
        const mod = await import('swapy');
        createSwapyFn = mod.createSwapy;
        swapyInstance = createSwapyFn(containerEl, { animation: 'dynamic' });
        if (onswap) {
          swapyInstance.onSwap((event: any) => {
            onswap(event);
          });
        }
      } catch {
        // swapy not installed — drag-to-swap disabled
      }
    }
  });

  onDestroy(() => {
    swapyInstance?.destroy();
  });
</script>

<div
  {id}
  bind:this={containerEl}
  class={cn('rdash', className)}
  style="display:grid; grid-template-columns:repeat(auto-fill,minmax({columnMin},1fr)); gap:{gap};"
>
  {@render children?.()}
</div>

<style>
  .rdash {
    width: 100%;
    align-content: start;
  }
  .rdash :global([data-swapy-item]) {
    transition: transform 0.2s ease;
  }
</style>
