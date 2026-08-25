<!-- src/lib/widgets/data/TreeTable.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  type Align = 'left' | 'center' | 'right';

  type Column = {
    key: string;
    label: string;
    align?: Align;
    width?: string;
    formatter?: any;
  };

  type Row = Record<string, unknown> & {
    id?: string | number;
    children?: Row[];
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    columns?: Column[];
    rows?: Row[];
    /** Default expansion: 'none' | 'first-level' | 'all'. */
    defaultExpanded?: 'none' | 'first-level' | 'all';
    /** Selected row id. */
    value?: string | number | null;
    striped?: boolean;
    dense?: boolean;
    emptyText?: string;
    onchange?: (value: string | number | null) => void;
  }

  let {
    id,
    class: className,
    style,
    columns: rawColumns = [],
    rows: rawRows = [],
    defaultExpanded = 'first-level',
    value = null,
    striped = true,
    dense = false,
    emptyText = 'No rows',
    onchange
  }: Props = $props();

  const columns = $derived(safeArray<Column>(rawColumns, { widget: 'tree-table', key: 'columns' }));
  const rows = $derived(safeArray<Row>(rawRows, { widget: 'tree-table', key: 'rows' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let expanded = $state<Set<string | number>>(new Set());
  let initialized = $state(false);

  $effect(() => {
    if (initialized) return;
    const next = new Set<string | number>();
    if (defaultExpanded === 'all') {
      const collect = (rs: Row[]) => {
        for (const r of rs) {
          if (r.id !== undefined && r.children?.length) {
            next.add(r.id);
            collect(r.children);
          }
        }
      };
      collect(rows);
    } else if (defaultExpanded === 'first-level') {
      for (const r of rows) if (r.id !== undefined && r.children?.length) next.add(r.id);
    }
    expanded = next;
    initialized = true;
  });

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }

  function toggleExpand(rid: string | number) {
    const next = new Set(expanded);
    if (next.has(rid)) next.delete(rid);
    else next.add(rid);
    expanded = next;
  }

  // Flatten rows for rendering, tracking depth.
  type Flat = { row: Row; depth: number; rid: string | number };
  const flatRows = $derived.by<Flat[]>(() => {
    const out: Flat[] = [];
    const visit = (rs: Row[], depth: number) => {
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        const rid = (r.id as string | number | undefined) ?? `${depth}.${i}`;
        out.push({ row: r, depth, rid });
        if (r.children?.length && expanded.has(rid)) {
          visit(r.children, depth + 1);
        }
      }
    };
    visit(rows, 0);
    return out;
  });

  function selectRow(row: Row) {
    onchange?.((row.id as string | number | undefined) ?? null);
  }
</script>

<div
  {id}
  class={cn('rounded-md border border-border overflow-hidden', className)}
  style={styleString}
>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-muted/40">
        <tr>
          {#each columns as col, ci (col.key)}
            <th
              scope="col"
              style={col.width ? `width: ${col.width}` : undefined}
              class={cn(
                'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                col.align === 'right' && 'text-right',
                col.align === 'center' && 'text-center',
                col.align !== 'right' && col.align !== 'center' && 'text-left'
              )}
            >
              {col.label}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#if flatRows.length === 0}
          <tr>
            <td colspan={columns.length || 1} class="px-3 py-10 text-center text-sm text-muted-foreground">
              {emptyText}
            </td>
          </tr>
        {:else}
          {#each flatRows as { row, depth, rid }, i (rid)}
            {@const isSelected = row.id !== undefined && value === row.id}
            {@const hasKids = !!row.children && row.children.length > 0}
            {@const isOpen = expanded.has(rid)}
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
              {#each columns as col, ci (col.key)}
                {@const cellValue = row[col.key]}
                <td
                  class={cn(
                    'align-middle',
                    dense ? 'px-3 py-1.5' : 'px-3 py-2.5',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                  style={ci === 0 ? `padding-left: ${depth * 16 + 12}px` : undefined}
                >
                  {#if ci === 0}
                    <span class="inline-flex items-center gap-1.5">
                      {#if hasKids}
                        <button
                          type="button"
                          class="rounded p-0.5 hover:bg-muted/60"
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          onclick={(e) => { e.stopPropagation(); toggleExpand(rid); }}
                        >
                          {#if isOpen}
                            <ChevronDownIcon size={12} />
                          {:else}
                            <ChevronRightIcon size={12} />
                          {/if}
                        </button>
                      {:else}
                        <span class="w-4 inline-block"></span>
                      {/if}
                      {#if isSpec(col.formatter)}
                        <NodeRenderer
                          node={col.formatter}
                          loopContext={{ value: cellValue, row, item: row, index: i }}
                        />
                      {:else if cellValue !== undefined && cellValue !== null}
                        <span>{cellValue}</span>
                      {/if}
                    </span>
                  {:else if isSpec(col.formatter)}
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
</div>
