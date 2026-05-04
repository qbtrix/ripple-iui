<!-- src/lib/widgets/data/DataGrid.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import SearchIcon from '@lucide/svelte/icons/search';

  type Align = 'left' | 'center' | 'right';

  type Column = {
    key: string;
    label: string;
    sortable?: boolean;
    align?: Align;
    width?: string;
    /** Optional UINode template — receives `value`, `row`, and `index` in loop context. */
    formatter?: any;
  };

  type Row = Record<string, unknown> & { id?: string | number };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    columns?: Column[];
    rows?: Row[];
    /** Selected row id. Bind via `bind: "<state-path>"`. */
    value?: string | number | null;
    pageSize?: number;
    /** When true, shows the search input above the grid. */
    searchable?: boolean;
    /** Initial sort: "<key>" (asc) or "<key>:desc". */
    defaultSort?: string;
    striped?: boolean;
    /** Compact density. */
    dense?: boolean;
    emptyText?: string;
    onchange?: (value: string | number | null) => void;
    onsort?: (info: { key: string; direction: 'asc' | 'desc' }) => void;
  }

  let {
    id,
    class: className,
    style,
    columns = [],
    rows = [],
    value = null,
    pageSize = 10,
    searchable = true,
    defaultSort,
    striped = true,
    dense = false,
    emptyText = 'No rows',
    onchange,
    onsort
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Sort state.
  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');

  $effect(() => {
    if (sortKey !== null) return;
    if (defaultSort) {
      const [k, dir] = defaultSort.split(':');
      sortKey = k;
      sortDir = (dir as 'asc' | 'desc') === 'desc' ? 'desc' : 'asc';
    }
  });

  let query = $state('');
  let page = $state(0);

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }

  const filtered = $derived.by(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))
    );
  });

  const sorted = $derived.by(() => {
    if (!sortKey) return filtered;
    const k = sortKey;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  });

  const pageCount = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
  const safePage = $derived(Math.min(page, pageCount - 1));
  const visibleRows = $derived(sorted.slice(safePage * pageSize, (safePage + 1) * pageSize));

  $effect(() => {
    void query;
    page = 0;
  });

  function toggleSort(col: Column) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = col.key;
      sortDir = 'asc';
    }
    onsort?.({ key: col.key, direction: sortDir });
  }

  function selectRow(row: Row) {
    const nextId = (row.id as string | number | undefined) ?? null;
    onchange?.(nextId);
  }
</script>

<div {id} class={cn('flex flex-col gap-2', className)} style={styleString}>
  {#if searchable}
    <div class="flex items-center gap-2 rounded-md border border-input bg-ripple-input px-3 h-9 max-w-sm">
      <SearchIcon size={14} class="opacity-60 shrink-0" />
      <input
        type="text"
        placeholder="Search..."
        bind:value={query}
        class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Search rows"
      />
    </div>
  {/if}

  <div class="rounded-md border border-border overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-muted/40">
          <tr>
            {#each columns as col (col.key)}
              <th
                scope="col"
                style={col.width ? `width: ${col.width}` : undefined}
                class={cn(
                  'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.align !== 'right' && col.align !== 'center' && 'text-left',
                  col.sortable && 'cursor-pointer select-none hover:text-foreground'
                )}
                onclick={() => toggleSort(col)}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <span class="inline-flex items-center gap-1">
                  {col.label}
                  {#if col.sortable && sortKey === col.key}
                    {#if sortDir === 'asc'}
                      <ChevronUpIcon size={12} />
                    {:else}
                      <ChevronDownIcon size={12} />
                    {/if}
                  {/if}
                </span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if visibleRows.length === 0}
            <tr>
              <td colspan={columns.length || 1} class="px-3 py-10 text-center text-sm text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          {:else}
            {#each visibleRows as row, i (row.id ?? i)}
              {@const isSelected = row.id !== undefined && value === row.id}
              <tr
                class={cn(
                  'border-t border-border transition-colors',
                  striped && i % 2 === 1 && 'bg-muted/20',
                  'hover:bg-muted/40',
                  isSelected && 'bg-primary/10 hover:bg-primary/15'
                )}
                onclick={() => selectRow(row)}
                aria-selected={isSelected}
              >
                {#each columns as col (col.key)}
                  {@const cellValue = row[col.key]}
                  <td
                    class={cn(
                      'align-middle',
                      dense ? 'px-3 py-1.5' : 'px-3 py-2.5',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {#if isSpec(col.formatter)}
                      <NodeRenderer
                        node={col.formatter}
                        loopContext={{ value: cellValue, row, item: row, index: i }}
                      />
                    {:else if cellValue !== undefined && cellValue !== null}
                      {cellValue}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    {#if pageCount > 1}
      <div class="flex items-center justify-between gap-2 border-t border-border px-3 py-2 bg-muted/20">
        <div class="text-xs text-muted-foreground">
          Page {safePage + 1} of {pageCount} · {sorted.length} row{sorted.length === 1 ? '' : 's'}
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded p-1 hover:bg-muted disabled:opacity-40"
            disabled={safePage === 0}
            onclick={() => (page = Math.max(0, safePage - 1))}
            aria-label="Previous page"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            type="button"
            class="rounded p-1 hover:bg-muted disabled:opacity-40"
            disabled={safePage >= pageCount - 1}
            onclick={() => (page = Math.min(pageCount - 1, safePage + 1))}
            aria-label="Next page"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
