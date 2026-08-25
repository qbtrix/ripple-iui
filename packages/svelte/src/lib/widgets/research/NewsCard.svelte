<!--
  NewsCard.svelte — news article row with source, time, sentiment, thumbnail.
  Modified: 2026-06-09 — a11y fix: bundle role/tabindex/onkeydown into a derived
  `interactive` spread so the row is a coherent keyboard-accessible button only
  when clickable (fixes a11y_no_noninteractive_tabindex). Recipe 2.
  Modified: 2026-06-27 — forward node id (bind id + data-ripple-node on the root)
  for editor selection (SP-0 id-forwarding codemod).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { faviconUrl } from './favicon.js';

  interface Props {
    /** Spec node id, forwarded by NodeRenderer for editor selection. */
    id?: string;
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
    id, headline, source, time, sentiment, image,
    url, class: className, onclick
  }: Props = $props();

  const iconSrc = $derived(faviconUrl(source));
  let iconError = $state(false);

  const sentimentConfig: Record<string, { label: string; color: string; bg: string }> = {
    bullish: { label: 'Bullish', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    bearish: { label: 'Bearish', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    neutral: { label: 'Neutral', color: 'var(--muted-foreground)', bg: 'color-mix(in oklab, var(--muted) 30%, transparent)' },
  };

  const handler = $derived(onclick ?? (url ? () => window.open(url, '_blank') : undefined));
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler?.(e);
    }
  }
  const interactive = $derived(
    handler ? { role: 'button', tabindex: 0, onclick: handler, onkeydown: handleKey } : {}
  );
</script>

<div {id} data-ripple-node={id} class={cn('rnews', className)} {...interactive}>
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
    border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
    transition: background 0.12s;
  }
  .rnews:last-child {
    border-bottom: none;
  }
  .rnews[role='button'] {
    cursor: pointer;
  }
  .rnews[role='button']:hover {
    background: color-mix(in oklab, var(--muted) 15%, transparent);
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
    color: var(--muted-foreground);
  }
  .rnews-dot {
    font-size: 10px;
    color: color-mix(in oklab, var(--muted-foreground) 50%, transparent);
  }
  .rnews-time {
    font-size: 11px;
    color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
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
    color: var(--foreground);
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
