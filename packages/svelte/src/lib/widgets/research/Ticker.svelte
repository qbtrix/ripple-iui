<!-- 2026-06-27: forward node id — bind id + data-ripple-node on root for editor selection (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';

  interface TickerItem {
    symbol: string;
    price: string;
    change: string;
    changePercent?: string;
  }

  interface Props {
    /** Spec node id, forwarded by NodeRenderer for editor selection. */
    id?: string;
    /** Single ticker or array for a ticker strip */
    items: TickerItem[];
    class?: string;
  }

  let { id, items = [], class: className }: Props = $props();

  // `change` comes from item data and can be a number — coerce before .trim.
  function isUp(change: unknown): boolean {
    return !asText(change).trim().startsWith('-');
  }
</script>

<div {id} data-ripple-node={id} class={cn('rtick', className)}>
  {#each items as item, i}
    {#if i > 0}<span class="rtick-sep"></span>{/if}
    <div class="rtick-item">
      <span class="rtick-sym">{item.symbol}</span>
      <span class="rtick-price">{item.price}</span>
      <span class="rtick-chg" class:rtick-up={isUp(item.change)} class:rtick-down={!isUp(item.change)}>
        {item.change}
        {#if item.changePercent}
          <span class="rtick-pct">({item.changePercent})</span>
        {/if}
      </span>
    </div>
  {/each}
</div>

<style>
  .rtick {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in oklab, var(--muted) 25%, transparent);
    overflow-x: auto;
  }
  .rtick-sep {
    width: 1px;
    height: 24px;
    background: var(--border);
    flex-shrink: 0;
    margin: 0 14px;
  }
  .rtick-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-shrink: 0;
  }
  .rtick-sym {
    font-size: 12px;
    font-weight: 700;
    color: var(--foreground);
    letter-spacing: 0.02em;
  }
  .rtick-price {
    font-size: 13px;
    font-weight: 600;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
  }
  .rtick-chg {
    font-size: 11px;
    font-weight: 600;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  .rtick-up { color: #22c55e; }
  .rtick-down { color: #ef4444; }
  .rtick-pct { opacity: 0.75; }
</style>
