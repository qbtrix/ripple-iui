<script lang="ts">
  import { cn } from '../../utils.js';
  import { faviconUrl } from './favicon.js';

  interface Props {
    /** Article headline */
    headline: string;
    /** Source/publisher name */
    source: string;
    /** Relative or absolute time */
    time?: string;
    /** Sentiment */
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    /** Thumbnail image URL */
    image?: string;
    /** Article URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
  }

  let {
    headline, source, time, sentiment, image,
    url, class: className, onclick
  }: Props = $props();

  const iconSrc = $derived(faviconUrl(source));
  let iconError = $state(false);

  const sentimentConfig: Record<string, { label: string; color: string; bg: string }> = {
    bullish: { label: 'Bullish', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    bearish: { label: 'Bearish', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    neutral: { label: 'Neutral', color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted) / 0.3)' },
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class={cn('rnews', className)}
  onclick={onclick ?? (url ? () => window.open(url, '_blank') : undefined)}
  role={onclick || url ? 'button' : undefined}
  tabindex={onclick || url ? 0 : undefined}
>
  <div class="rnews-body">
    <div class="rnews-source-row">
      {#if !iconError}
        <img src={iconSrc} alt="" class="rnews-favicon" onerror={() => iconError = true} />
      {/if}
      <span class="rnews-source">{source}</span>
      {#if time}
        <span class="rnews-dot">&middot;</span>
        <span class="rnews-time">{time}</span>
      {/if}
      {#if sentiment && sentimentConfig[sentiment]}
        {@const s = sentimentConfig[sentiment]}
        <span class="rnews-sentiment" style="color:{s.color}; background:{s.bg}">{s.label}</span>
      {/if}
    </div>
    <p class="rnews-headline">{headline}</p>
  </div>
  {#if image}
    <img src={image} alt="" class="rnews-thumb" />
  {/if}
</div>

<style>
  .rnews {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    transition: background 0.12s;
  }
  .rnews:last-child {
    border-bottom: none;
  }
  .rnews[role='button'] {
    cursor: pointer;
  }
  .rnews[role='button']:hover {
    background: hsl(var(--muted) / 0.15);
  }
  .rnews-body {
    flex: 1;
    min-width: 0;
  }
  .rnews-source-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 3px;
  }
  .rnews-favicon {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    object-fit: contain;
  }
  .rnews-source {
    font-size: 11px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
  }
  .rnews-dot {
    font-size: 10px;
    color: hsl(var(--muted-foreground) / 0.5);
  }
  .rnews-time {
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.7);
  }
  .rnews-sentiment {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: auto;
  }
  .rnews-headline {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: hsl(var(--foreground));
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rnews-thumb {
    width: 72px;
    height: 52px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
</style>
