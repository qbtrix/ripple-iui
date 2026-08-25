<!-- 2026-06-27: forward node id — bind id + data-ripple-node on root for editor selection (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';

  interface KvRow {
    key: string;
    value: string;
  }

  interface Props {
    /** Spec node id, forwarded by NodeRenderer for editor selection. */
    id?: string;
    /** Array of key-value rows */
    rows: KvRow[];
    /** Number of columns (1 or 2) */
    columns?: 1 | 2;
    /** Show subtle alternating row backgrounds */
    striped?: boolean;
    class?: string;
  }

  let { id, rows: rawRows = [], columns = 1, striped = true, class: className }: Props = $props();

  const rows = $derived(safeArray<KvRow>(rawRows, { widget: 'kv-table', key: 'rows' }));

  /** Split rows into column groups */
  const groups = $derived.by(() => {
    if (columns === 1) return [rows];
    const mid = Math.ceil(rows.length / 2);
    return [rows.slice(0, mid), rows.slice(mid)];
  });
</script>

<div {id} data-ripple-node={id} class={cn('rkv', columns === 2 ? 'rkv-2col' : '', className)}>
  {#each groups as group}
    <div class="rkv-col">
      {#each group as row, i}
        <div class="rkv-row" class:rkv-striped={striped && i % 2 === 0}>
          <span class="rkv-key">{row.key}</span>
          <span class="rkv-val">{row.value}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .rkv {
    display: flex;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .rkv-2col {
    gap: 0;
  }
  .rkv-2col .rkv-col:first-child {
    border-right: 1px solid var(--border);
  }
  .rkv-col {
    flex: 1;
    min-width: 0;
  }
  .rkv-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    gap: 12px;
  }
  .rkv-striped {
    background: color-mix(in oklab, var(--muted) 20%, transparent);
  }
  .rkv-row:not(:last-child) {
    border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
  }
  .rkv-key {
    font-size: 12px;
    color: var(--muted-foreground);
    flex-shrink: 0;
  }
  .rkv-val {
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
    text-align: right;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
