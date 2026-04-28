<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface FeedItem {
    text: string;
    time?: string;
    dot?: string;
    type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  }

  interface Props {
    items: FeedItem[];
    maxItems?: number;
    class?: string;
  }

  let { items = [], maxItems, class: className }: Props = $props();

  const visibleItems = $derived(maxItems ? items.slice(0, maxItems) : items);

  const dotColorMap: Record<string, string> = {
    success: 'var(--chart-2)',
    warning: 'var(--chart-4)',
    error: 'var(--destructive)',
    info: 'var(--chart-1)',
  };

  function getDotColor(item: FeedItem): string {
    if (item.dot) return item.dot;
    if (item.type && dotColorMap[item.type]) return dotColorMap[item.type];
    return 'var(--muted-foreground)';
  }
</script>

<div class={cn('rfeed', className)}>
  {#each visibleItems as item}
    <div class="rfeed-row">
      <span class="rfeed-dot" style="background:{getDotColor(item)}"></span>
      <span class="rfeed-text">{item.text}</span>
      {#if item.time}<span class="rfeed-time">{item.time}</span>{/if}
    </div>
  {/each}
</div>

<style>
  .rfeed {
    display: flex;
    flex-direction: column;
  }
  .rfeed-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
  }
  .rfeed-row:last-child { border-bottom: none; }
  .rfeed-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }
  .rfeed-text {
    flex: 1;
    font-size: 12px;
    line-height: 1.5;
    color: color-mix(in oklab, var(--foreground) 75%, transparent);
    min-width: 0;
  }
  .rfeed-time {
    font-size: 11px;
    color: var(--muted-foreground);
    flex-shrink: 0;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
</style>
