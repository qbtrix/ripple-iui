<!--
  C4ViewNode.svelte — the one SvelteFlow node type semantic zoom gives every element. It draws the
  element's current view (data.view: a card type, `group` for an open boundary, `code` for a code
  panel) with that view's component from C4_VIEWS.

  Why one type: an element changes view as the map opens and closes, and a changed SvelteFlow `type`
  makes SvelteFlow re-measure that node and re-adopt the whole map, once per changed node, right
  after a new layout lands. Swapping the component in here costs only the swap.
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import type { C4NodeData } from '../types.js';
  import { C4_VIEWS } from './index.js';

  let { data }: { data: C4NodeData } = $props();

  const views: Record<string, Component<{ data: C4NodeData }>> = C4_VIEWS;
  const View = $derived(views[data.view ?? ''] ?? C4_VIEWS.component);
</script>

<View {data} />
