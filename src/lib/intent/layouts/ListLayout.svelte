<!--
  ListLayout.svelte — designed vertical-list layout for intent='browse'/'select' (Wave 3: layouts).
  Created 2026-06-07.
  Adapted from ocean-flow's ListLayout. A denser, single-column variant of the card
  grid: it COMPOSES CardGridLayout in `dense` mode so the two share one ItemCard
  rendering path (no duplicated card chrome). Used when the display hint asks for a
  list, or for text-only browse/select data with no images.

  PURE: reads only the adapter's `input`; selection state is host-owned. No fetch.
-->
<script lang="ts">
  import CardGridLayout from './CardGridLayout.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    selectedIds?: string[];
    onSelect?: (id: string, item: Record<string, unknown>) => void;
  }

  let { input, selectedIds = [], onSelect }: Props = $props();
</script>

<CardGridLayout {input} {selectedIds} {onSelect} dense />
