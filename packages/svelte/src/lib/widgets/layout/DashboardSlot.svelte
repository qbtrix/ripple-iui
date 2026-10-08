<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

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
    span === 'auto' ? '' : safeStyle(`grid-column: span ${span}`)
  );
</script>

<div class={cn('rdash-slot', className)} style={spanStyle}>
  <div>
    {@render children?.()}
  </div>
</div>

<style>
  .rdash-slot {
    min-width: 0;
    min-height: 0;
  }
</style>
