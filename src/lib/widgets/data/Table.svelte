<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { EventHandlerOrArray } from '../../schema/event-handler.js';
  import type { EventDispatcher } from '../../core/event-dispatcher.js';
  import type { StateManager } from '../../core/state-manager.svelte.js';
  import * as Table from '$lib/components/ui/table/index.js';

  interface TableColumn {
    header?: string;
    label?: string;
    accessorKey?: string;
    key?: string;
  }

  interface Props {
    data?: any[];
    rows?: any[];
    columns?: TableColumn[];
    /** Visual variant */
    variant?: 'default' | 'compact' | 'striped' | 'minimal';
    /** Column key for status dot color (e.g. "_status") */
    statusKey?: string;
    onRowClick?: EventHandlerOrArray;
    class?: string;
  }

  let {
    data, rows, columns: rawColumns = [], variant = 'default',
    statusKey, onRowClick, class: className
  }: Props = $props();

  // Normalize: accept both {key,label} and {accessorKey,header}
  const columns = $derived(
    rawColumns.map(c => ({
      accessorKey: c.accessorKey ?? c.key ?? '',
      header: c.header ?? c.label ?? '',
    }))
  );

  // Accept both `data` and `rows`
  const tableData = $derived(data ?? rows ?? []);

  const eventDispatcher = getContext<EventDispatcher>('ui-events');
  const stateManager = getContext<StateManager>('ui-state');
  const dataStore = getContext<Record<string, unknown>>('ui-data');

  async function handleRowClick(row: any, index: number) {
    if (onRowClick) {
      await eventDispatcher.dispatch(onRowClick, {
        state: stateManager.state, data: dataStore ?? {}, item: row, index
      });
    }
  }

  const variantClasses = $derived({
    'default': '',
    'compact': '[&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs',
    'striped': '[&_tr:nth-child(even)]:bg-muted/50',
    'minimal': '[&_th]:border-b-0 [&_td]:border-b-0',
  }[variant]);
</script>

<div class={cn('rounded-md border', variantClasses, className)}>
  <Table.Root>
    <Table.Header>
      <Table.Row>
        {#each columns as col}
          <Table.Head>{col.header}</Table.Head>
        {/each}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#if tableData.length > 0}
        {#each tableData as row, i}
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
                {row[col.accessorKey] ?? ''}
              </Table.Cell>
            {/each}
          </Table.Row>
        {/each}
      {:else}
        <Table.Row>
          <Table.Cell colspan={columns.length} class="h-24 text-center">
            No results.
          </Table.Cell>
        </Table.Row>
      {/if}
    </Table.Body>
  </Table.Root>
</div>
