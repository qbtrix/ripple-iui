<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { faviconUrl } from './favicon.js';

  interface Props {
    /** Company name */
    name: string;
    /** Stock ticker symbol */
    ticker?: string;
    /** Exchange name (NSE, NYSE, NASDAQ) */
    exchange?: string;
    /** One-line company description */
    description?: string;
    /** Logo image URL (auto-derived from domain if omitted) */
    logo?: string;
    /** Domain for auto logo (e.g. "reliance.com") */
    domain?: string;
    /** Sector / industry tags */
    tags?: string[];
    /** Current stock price */
    price?: string;
    /** Price change string (e.g. "+12.50") */
    change?: string;
    /** Price change percent (e.g. "+1.24%") */
    changePercent?: string;
    /** Market cap */
    marketCap?: string;
    class?: string;
  }

  let {
    name, ticker, exchange, description, logo, domain,
    tags = [], price, change, changePercent, marketCap,
    class: className
  }: Props = $props();

  const logoSrc = $derived(
    logo ?? (domain ? `https://logo.clearbit.com/${domain}` : undefined)
  );
  let logoError = $state(false);

  const isPositive = $derived(change ? !change.startsWith('-') : true);
</script>

<div class={cn('rch', className)}>
  <div class="rch-top">
    <div class="rch-identity">
      {#if logoSrc && !logoError}
        <img src={logoSrc} alt={name} class="rch-logo" onerror={() => logoError = true} />
      {:else}
        <div class="rch-logo-fallback">{name.charAt(0)}</div>
      {/if}
      <div class="rch-name-block">
        <div class="rch-name-row">
          <span class="rch-name">{name}</span>
          {#if ticker}
            <span class="rch-ticker">{ticker}</span>
          {/if}
          {#if exchange}
            <span class="rch-exchange">{exchange}</span>
          {/if}
        </div>
        {#if description}
          <p class="rch-desc">{description}</p>
        {/if}
      </div>
    </div>

    {#if price}
      <div class="rch-price-block">
        <span class="rch-price">{price}</span>
        {#if change || changePercent}
          <span class="rch-change" class:rch-up={isPositive} class:rch-down={!isPositive}>
            {#if change}{change}{/if}
            {#if changePercent}<span class="rch-pct">({changePercent})</span>{/if}
          </span>
        {/if}
      </div>
    {/if}
  </div>

  {#if tags.length > 0 || marketCap}
    <div class="rch-meta">
      {#if tags.length > 0}
        <div class="rch-tags">
          {#each tags as tag}
            <span class="rch-tag">{tag}</span>
          {/each}
        </div>
      {/if}
      {#if marketCap}
        <span class="rch-mcap">Mkt Cap: <strong>{marketCap}</strong></span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .rch {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .rch-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .rch-identity {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }
  .rch-logo {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: contain;
    background: hsl(var(--muted) / 0.3);
    flex-shrink: 0;
  }
  .rch-logo-fallback {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    flex-shrink: 0;
  }
  .rch-name-block {
    min-width: 0;
  }
  .rch-name-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rch-name {
    font-size: 18px;
    font-weight: 700;
    color: hsl(var(--foreground));
    line-height: 1.2;
  }
  .rch-ticker {
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
  }
  .rch-exchange {
    font-size: 10px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
    background: hsl(var(--muted) / 0.5);
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .rch-desc {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
    margin: 3px 0 0;
    line-height: 1.4;
  }
  .rch-price-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .rch-price {
    font-size: 22px;
    font-weight: 700;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    color: hsl(var(--foreground));
    line-height: 1;
  }
  .rch-change {
    font-size: 12px;
    font-weight: 600;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    margin-top: 3px;
  }
  .rch-up { color: #22c55e; }
  .rch-down { color: #ef4444; }
  .rch-pct { opacity: 0.8; }
  .rch-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rch-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }
  .rch-tag {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 5px;
    background: hsl(var(--muted) / 0.45);
    color: hsl(var(--muted-foreground));
  }
  .rch-mcap {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .rch-mcap strong {
    color: hsl(var(--foreground));
  }
</style>
