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
    /** Visual variant */
    variant?: 'default' | 'compact' | 'striped' | 'minimal';
    /** Column key for status dot color (e.g. "_status") */
    statusKey?: string;
    onRowClick?: EventHandlerOrArray;
    class?: string;
  }

  let {
    data = [], columns = [], variant = 'default',
    statusKey, onRowClick, class: className
  }: Props = $props();

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

<div class="rtbl rtbl--{variant} {className ?? ''}">
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
              <td class="rtbl-td" class:rtbl-td--first={ci === 0}>
                {#if ci === 0 && statusKey && row[statusKey]}
                  <span class="rtbl-dot" style="background:{row[statusKey]}"></span>
                {/if}
                {row[col.accessorKey] ?? ''}
              </td>
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

  .rtbl-dot {
    display: inline-block;
    width: 5px; height: 5px; border-radius: 50%;
    margin-right: 6px; vertical-align: middle;
    flex-shrink: 0;
  }

  /* Compact variant */
  .rtbl--compact .rtbl-th { padding: 0 3px 4px; font-size: 9px; }
  .rtbl--compact .rtbl-td { padding: 3px; font-size: 10px; }

  /* Striped variant */
  .rtbl--striped .rtbl-row:nth-child(even) .rtbl-td { background: var(--ripple-surface); }
  .rtbl--striped .rtbl-td { border-bottom: none; }

  /* Minimal variant — no header borders */
  .rtbl--minimal .rtbl-th { border-bottom: none; padding-bottom: 4px; }
  .rtbl--minimal .rtbl-td { border-bottom: none; }

  .rtbl-empty { padding: 12px 4px; text-align: center; color: var(--ripple-text-muted); }
</style>
