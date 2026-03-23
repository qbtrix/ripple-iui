<script lang="ts">
  import { getContext } from 'svelte';
  import type { EventHandlerOrArray } from '../../schema/event-handler.js';
  import type { EventDispatcher } from '../../core/event-dispatcher.js';
  import type { StateManager } from '../../core/state-manager.svelte.js';

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

<div class="rtbl {className ?? ''}">
  <table class="rtbl-table">
    <thead>
      <tr>{#each columns as col}<th class="rtbl-th">{col.header}</th>{/each}</tr>
    </thead>
    <tbody>
      {#if data && data.length > 0}
        {#each data as row, i}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <tr class="rtbl-row" class:rtbl-row--click={!!onRowClick} onclick={() => handleRowClick(row, i)}>
            {#each columns as col, ci}
              <td class="rtbl-td" class:rtbl-td--first={ci === 0}>{row[col.accessorKey] ?? ''}</td>
            {/each}
          </tr>
        {/each}
      {:else}
        <tr><td class="rtbl-empty" colspan={columns.length}>No results.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .rtbl { width: 100%; overflow: hidden; }
  .rtbl-table { width: 100%; border-collapse: collapse; }
  .rtbl-th {
    text-align: left; padding: 0 4px 6px;
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--ripple-text-dim);
    border-bottom: 1px solid var(--ripple-border);
  }
  .rtbl-td {
    padding: 5px 4px; font-size: 11px;
    color: var(--ripple-text-secondary);
    border-bottom: 1px solid var(--ripple-border-subtle);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .rtbl-td--first { font-weight: 500; color: var(--ripple-text); }
  .rtbl-row:last-child .rtbl-td { border-bottom: none; }
  .rtbl-row--click { cursor: pointer; }
  .rtbl-row--click:hover .rtbl-td { background: var(--ripple-surface); }
  .rtbl-empty { padding: 12px 4px; text-align: center; color: var(--ripple-text-muted); }
</style>
