<script lang="ts">
  import { getContext } from 'svelte';
  import type { EventHandlerOrArray } from '../../schema/event-handler.js';
  import type { EventDispatcher } from '../../core/event-dispatcher.js';
  import type { StateManager } from '../../core/state-manager.svelte.js';
  import { cn } from '../../utils.js';

  interface TableColumn {
    header: string;
    accessorKey: string;
  }

  interface Props {
    data?: any[];
    columns?: TableColumn[];
    onRowClick?: EventHandlerOrArray;
    class?: string;
  }

  let { data = [], columns = [], onRowClick, class: className }: Props = $props();

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
</script>

<div class={cn('ripple-table-wrapper', className)}>
  <table class="ripple-table">
    <thead>
      <tr>{#each columns as col}<th>{col.header}</th>{/each}</tr>
    </thead>
    <tbody>
      {#if data && data.length > 0}
        {#each data as row, i}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <tr class={onRowClick ? 'ripple-table-row--clickable' : ''}
            onclick={() => handleRowClick(row, i)}>
            {#each columns as col}<td>{row[col.accessorKey] ?? ''}</td>{/each}
          </tr>
        {/each}
      {:else}
        <tr><td colspan={columns.length}>No results.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
