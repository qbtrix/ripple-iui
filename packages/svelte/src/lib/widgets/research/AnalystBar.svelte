<!-- 2026-06-27: forward node id — bind id + data-ripple-node on root for editor selection (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    /** Spec node id, forwarded by NodeRenderer for editor selection. */
    id?: string;
    /** Number of Buy/Overweight ratings */
    buy?: number;
    /** Number of Hold ratings */
    hold?: number;
    /** Number of Sell/Underweight ratings */
    sell?: number;
    /** Consensus label (e.g. "Overweight", "Buy") */
    consensus?: string;
    /** Average target price */
    target?: string;
    class?: string;
  }

  let {
    id, buy = 0, hold = 0, sell = 0,
    consensus, target, class: className
  }: Props = $props();

  const total = $derived(buy + hold + sell);
  const buyPct = $derived(total ? (buy / total * 100) : 0);
  const holdPct = $derived(total ? (hold / total * 100) : 0);
  const sellPct = $derived(total ? (sell / total * 100) : 0);
</script>

<div {id} data-ripple-node={id} class={cn('rab', className)}>
  {#if consensus || target}
    <div class="rab-header">
      {#if consensus}
        <span class="rab-consensus">{consensus}</span>
      {/if}
      {#if target}
        <span class="rab-target">Target: <strong>{target}</strong></span>
      {/if}
    </div>
  {/if}

  <div class="rab-bar">
    {#if buyPct > 0}
      <div class="rab-seg rab-buy" style="width:{buyPct}%"></div>
    {/if}
    {#if holdPct > 0}
      <div class="rab-seg rab-hold" style="width:{holdPct}%"></div>
    {/if}
    {#if sellPct > 0}
      <div class="rab-seg rab-sell" style="width:{sellPct}%"></div>
    {/if}
  </div>

  <div class="rab-labels">
    <div class="rab-label">
      <span class="rab-dot" style="background:#22c55e"></span>
      <span class="rab-count">{buy}</span>
      <span class="rab-ltext">Buy</span>
    </div>
    <div class="rab-label">
      <span class="rab-dot" style="background:#f59e0b"></span>
      <span class="rab-count">{hold}</span>
      <span class="rab-ltext">Hold</span>
    </div>
    <div class="rab-label">
      <span class="rab-dot" style="background:#ef4444"></span>
      <span class="rab-count">{sell}</span>
      <span class="rab-ltext">Sell</span>
    </div>
  </div>
</div>

<style>
  .rab {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rab-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .rab-consensus {
    font-size: 14px;
    font-weight: 700;
    color: var(--foreground);
  }
  .rab-target {
    font-size: 12px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rab-target strong {
    color: var(--foreground);
    font-weight: 600;
  }
  .rab-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    gap: 1.5px;
  }
  .rab-seg {
    border-radius: 4px;
    min-width: 4px;
    transition: width 0.3s ease;
  }
  .rab-buy { background: #22c55e; }
  .rab-hold { background: #f59e0b; }
  .rab-sell { background: #ef4444; }
  .rab-labels {
    display: flex;
    gap: 16px;
  }
  .rab-label {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .rab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .rab-count {
    font-size: 12px;
    font-weight: 700;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
  .rab-ltext {
    font-size: 11px;
    color: var(--muted-foreground);
  }
</style>
