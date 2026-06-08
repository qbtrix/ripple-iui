<!--
  SearchLayout.svelte — designed search layout for intent='search' (Wave 3: layouts).
  Created 2026-06-07.
  Adapted from ocean-flow's SearchLayout. A search field above a results region that
  COMPOSES CardGridLayout (or, dense, ListLayout) for the matches — so search reuses
  the same ItemCard rendering path as browse/select. The input is presentational:
  the host owns the query + the (already-filtered) results, surfaced via onSearch.

  PURE: reads only the adapter's `input` for results; query/selection state are
  host-owned. No fetch, no service.
-->
<script lang="ts">
  import CardGridLayout from './CardGridLayout.svelte';
  import ListLayout from './ListLayout.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    /** Current query text (host-owned). */
    query?: string;
    /** Fired on each query change so the host can filter/fetch results. */
    onSearch?: (q: string) => void;
    /** Selected result ids (when the search results are selectable). */
    selectedIds?: string[];
    onSelect?: (id: string, item: Record<string, unknown>) => void;
  }

  let { input, query = '', onSearch, selectedIds = [], onSelect }: Props = $props();

  const placeholder = $derived(input.spec.description ?? 'Search…');
  // A single-column (list) result layout reads better for text-only results.
  const dense = $derived(!input.meta.showImages);
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center gap-2 rounded-ripple border border-ripple-border bg-ripple-input px-3 py-2.5 focus-within:border-ripple-accent">
    <svg
      class="h-4 w-4 shrink-0 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
    <input
      type="search"
      role="searchbox"
      class="flex-1 bg-transparent text-sm text-ripple-input-foreground outline-none placeholder:text-muted-foreground"
      {placeholder}
      value={query}
      oninput={(e) => onSearch?.(e.currentTarget.value)}
    />
  </div>

  {#if dense}
    <ListLayout {input} {selectedIds} {onSelect} />
  {:else}
    <CardGridLayout {input} {selectedIds} {onSelect} />
  {/if}
</div>
