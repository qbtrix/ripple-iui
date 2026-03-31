<!-- Dashboard.svelte — Legacy auto-fill grid layout widget.
     Note: Drag-to-swap (Swapy) removed. Use DashboardRenderer (Muuri) for interactive dashboards.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    id?: string;
    class?: string;
    children?: Snippet;
    /** Min column width — grid auto-fills based on container */
    columnMin?: string;
    gap?: string;
  }

  let {
    id, class: className, children,
    columnMin = '240px', gap = '12px',
  }: Props = $props();
</script>

<div
  {id}
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
</style>
