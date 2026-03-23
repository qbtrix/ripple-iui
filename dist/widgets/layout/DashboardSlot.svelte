<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    slotId: string;
    itemId: string;
    class?: string;
    /** Column span: 1, 2, 3 or 'auto' */
    span?: number | 'auto';
    children?: Snippet;
  }

  let { slotId, itemId, class: className, span = 1, children }: Props = $props();

  const spanStyle = $derived(
    span === 'auto' ? '' : `grid-column: span ${span}`
  );
</script>

<div data-swapy-slot={slotId} class={cn('rdash-slot', className)} style={spanStyle}>
  <div data-swapy-item={itemId}>
    {@render children?.()}
  </div>
</div>

<style>
  .rdash-slot {
    min-width: 0;
    min-height: 0;
  }
</style>
