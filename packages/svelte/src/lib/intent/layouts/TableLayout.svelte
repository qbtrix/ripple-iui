<!--
  TableLayout.svelte — designed table layout (Wave 3: ported layouts).
  Created 2026-06-07.
  Ripple-native port of ocean-flow's TableLayout. Composes ripple's existing
  Table widget (widgets/data/Table.svelte) — no shadcn table primitives imported
  directly here. The adapter feeds structured `items`; columns are derived from
  the field mapping (title → Name, subtitle → Description, etc.) so any spec
  with `display.layout='table'` renders a sortable, searchable table without
  additional config.

  Routed for the `table` display hint (display.layout='table'). PURE — reads
  only `input` from the adapter, no fetch / service. No top-level $state
  (child-only component — avoids the repo's mounted-entry $state flake).
-->
<script lang="ts">
  import TableWidget from '$lib/widgets/data/Table.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    /** Called when the user clicks a row. */
    onRowSelect?: (item: Record<string, unknown>) => void;
  }

  let { input, onRowSelect }: Props = $props();

  const fields = $derived(input.fields);
  const items = $derived(input.items);

  // Derive columns from the field mapping. We prefer a curated set (title →
  // "Name", subtitle → "Description", price, status, location) so the table
  // reads naturally out of the box. Keys whose mapped path doesn't exist in
  // the data are skipped — the column array is spec-driven, not hard-coded.
  const columns = $derived.by(() => {
    const cols: { header: string; accessorKey: string }[] = [];
    const SEMANTIC_COLS: [string, string][] = [
      ['title', 'Name'],
      ['subtitle', 'Description'],
      ['status', 'Status'],
      ['price', 'Price'],
      ['location', 'Location'],
      ['date', 'Date'],
      ['icon', 'Icon'],
    ];

    for (const [semantic, header] of SEMANTIC_COLS) {
      const mapped = fields[semantic];
      if (mapped && items.some((r) => mapped in r)) {
        cols.push({ header, accessorKey: mapped });
      }
    }

    // Fall back to all keys of the first item when the field map yields nothing.
    if (cols.length === 0 && items.length > 0) {
      return Object.keys(items[0]).map((k) => ({
        header: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '),
        accessorKey: k,
      }));
    }

    return cols;
  });
</script>

{#if items.length === 0}
  <EmptyState title="No data" description="There is nothing to display in this table." icon="table" />
{:else}
  <div class="table-layout">
    {#if input.title}
      <h2 class="table-layout__title">{input.title}</h2>
    {/if}
    {#if input.description}
      <p class="table-layout__description">{input.description}</p>
    {/if}
    <TableWidget
      data={items}
      {columns}
      sortable
      searchable={items.length > 8}
    />
  </div>
{/if}

<style>
  .table-layout {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .table-layout__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ripple-foreground, inherit);
  }
  .table-layout__description {
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
  }
</style>
