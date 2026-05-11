<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { EventHandlerOrArray } from '../../schema/event-handler.js';
  import type { EventDispatcher } from '../../core/event-dispatcher.js';
  import type { StateManager } from '../../core/state-manager.svelte.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

  interface TableColumn {
    header?: string;
    label?: string;
    accessorKey?: string;
    key?: string;
    sortable?: boolean;
  }

  interface Props {
    data?: any[];
    rows?: any[];
    columns?: Array<TableColumn | string>;
    /** Visual variant. */
    variant?: 'default' | 'compact' | 'striped' | 'minimal';
    /** Column key for a status dot prefix (e.g. "_status"). */
    statusKey?: string;
    /** Enable sortable columns (click headers). Default true when columns are objects with sortable:true, or when this prop is true. */
    sortable?: boolean;
    /** Show a search input that filters rows across all visible columns. */
    searchable?: boolean;
    /** If set, paginate rows; click prev/next to walk pages. */
    pageSize?: number;
    onRowClick?: EventHandlerOrArray;
    class?: string;
  }

  let {
    data, rows, columns: rawColumns = [], variant = 'default',
    statusKey, sortable: tableSortable = false, searchable = false,
    pageSize, onRowClick, class: className
  }: Props = $props();

  const tableData = $derived(data ?? rows ?? []);

  const columns = $derived.by(() => {
    if (rawColumns.length > 0) {
      return rawColumns.map((c) => {
        if (typeof c === 'string') return { accessorKey: c, header: c, sortable: tableSortable };
        return {
          accessorKey: c.accessorKey ?? c.key ?? c.header ?? c.label ?? '',
          header: c.header ?? c.label ?? c.accessorKey ?? c.key ?? '',
          sortable: c.sortable ?? tableSortable
        };
      });
    }
    const first = tableData[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return Object.keys(first).map((k) => ({ accessorKey: k, header: k, sortable: tableSortable }));
    }
    return [];
  });

  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');
  let query = $state('');
  let page = $state(0);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') sortDir = 'desc';
      else { sortKey = null; sortDir = 'asc'; }
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }

  function compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  }

  const filtered = $derived.by(() => {
    if (!searchable || !query.trim()) return tableData;
    const q = query.toLowerCase();
    return tableData.filter((row) => {
      if (typeof row !== 'object' || row === null) return String(row).toLowerCase().includes(q);
      return columns.some((c) => {
        const v = (row as Record<string, unknown>)[c.accessorKey ?? ''];
        return v !== undefined && v !== null && String(v).toLowerCase().includes(q);
      });
    });
  });

  const sorted = $derived.by(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)?.[sortKey!];
      const bv = (b as Record<string, unknown>)?.[sortKey!];
      return compareValues(av, bv) * dir;
    });
  });

  const totalPages = $derived(pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1);
  // Reactively clamp page to valid range when filtered/sorted shrinks.
  $effect(() => {
    if (page >= totalPages) page = Math.max(0, totalPages - 1);
  });

  const visible = $derived.by(() => {
    if (!pageSize) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  });

  const eventDispatcher = getContext<EventDispatcher>('ui-events');
  const stateManager = getContext<StateManager>('ui-state');
  const dataStore = getContext<Record<string, unknown>>('ui-data');

  async function handleRowClick(row: any, index: number) {
    if (!onRowClick) return;
    await eventDispatcher.dispatch(onRowClick, {
      state: stateManager.state, data: dataStore ?? {}, item: row, index
    });
  }

  const variantClasses = $derived({
    'default': '',
    'compact': '[&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs',
    'striped': '[&_tbody_tr:nth-child(even)]:bg-muted/50',
    'minimal': '[&_th]:border-b-0 [&_td]:border-b-0'
  }[variant]);
</script>

<div class={cn('flex flex-col gap-2', className)}>
  {#if searchable}
    <div class="flex items-center gap-2">
      <input
        type="search"
        placeholder="Search..."
        bind:value={query}
        class="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <span class="text-xs text-muted-foreground tabular-nums">{sorted.length} {sorted.length === 1 ? 'row' : 'rows'}</span>
    </div>
  {/if}

  <div class={cn('rounded-md border', variantClasses)}>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {#each columns as col}
            {#if col.sortable && col.accessorKey}
              <Table.Head>
                <button
                  type="button"
                  onclick={() => toggleSort(col.accessorKey!)}
                  class="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:bg-muted/60 transition-colors text-left font-medium"
                >
                  <span>{col.header}</span>
                  {#if sortKey === col.accessorKey}
                    {#if sortDir === 'asc'}
                      <ChevronUpIcon size={12} />
                    {:else}
                      <ChevronDownIcon size={12} />
                    {/if}
                  {:else}
                    <ChevronsUpDownIcon size={12} class="opacity-40" />
                  {/if}
                </button>
              </Table.Head>
            {:else}
              <Table.Head>{col.header}</Table.Head>
            {/if}
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if visible.length > 0}
          {#each visible as row, i}
            <Table.Row
              class={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onclick={() => handleRowClick(row, i)}
            >
              {#each columns as col, ci}
                <Table.Cell>
                  {#if ci === 0 && statusKey && row[statusKey]}
                    <span
                      class="mr-1.5 inline-block size-2 rounded-full align-middle"
                      style="background:{row[statusKey]}"
                    ></span>
                  {/if}
                  {#if col.accessorKey && row[col.accessorKey] !== undefined}
                    {row[col.accessorKey]}
                  {:else}
                    {Object.values(row)[ci] ?? ''}
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center text-muted-foreground">
              No results.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  {#if pageSize && sorted.length > pageSize}
    <div class="flex items-center justify-between text-xs text-muted-foreground">
      <span class="tabular-nums">
        Page {page + 1} of {totalPages}
      </span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={() => page = Math.max(0, page - 1)}
          disabled={page === 0}
          class="h-7 rounded-md border border-border px-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 transition-colors"
        >Prev</button>
        <button
          type="button"
          onclick={() => page = Math.min(totalPages - 1, page + 1)}
          disabled={page >= totalPages - 1}
          class="h-7 rounded-md border border-border px-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 transition-colors"
        >Next</button>
      </div>
    </div>
  {/if}
</div>
