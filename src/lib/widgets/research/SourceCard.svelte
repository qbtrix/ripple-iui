<!--
  SourceCard.svelte — research source card with favicon, source name, title.
  Modified: 2026-06-09 — a11y fix: bundle role/tabindex/onkeydown into a derived
  `interactive` spread so the card is a coherent keyboard-accessible button only
  when clickable (fixes a11y_no_noninteractive_tabindex). Recipe 2.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { faviconUrl } from './favicon.js';

  interface Props {
    /** Source/publisher name */
    source: string;
    /** Headline or title text */
    title: string;
    /** Dot/accent color (CSS color value) — used only if favicon fails */
    color?: string;
    /** Override favicon URL (auto-derived from source name if omitted) */
    favicon?: string;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
  }

  let {
    source, title, color = 'var(--primary)',
    favicon, url, class: className, onclick
  }: Props = $props();

  const iconSrc = $derived(favicon ?? faviconUrl(source));
  let iconError = $state(false);

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

<div class={cn('rsrc-card', className)} {...interactive}>
  <div class="rsrc-card-head">
    {#if !iconError}
      <img src={iconSrc} alt="" class="rsrc-card-favicon" onerror={() => iconError = true} />
    {:else}
      <span class="rsrc-card-dot" style="background:{color}"></span>
    {/if}
    <span class="rsrc-card-source">{source}</span>
  </div>
  <p class="rsrc-card-title">{title}</p>
</div>

<style>
  .rsrc-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    min-width: 160px;
    max-width: 200px;
    flex-shrink: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rsrc-card[role='button'] {
    cursor: pointer;
  }
  .rsrc-card[role='button']:hover {
    border-color: color-mix(in oklab, var(--primary) 40%, transparent);
    box-shadow: 0 1px 4px color-mix(in oklab, var(--primary) 8%, transparent);
  }
  .rsrc-card-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rsrc-card-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .rsrc-card-favicon {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .rsrc-card-source {
    font-size: 11px;
    font-weight: 500;
    color: var(--muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rsrc-card-title {
    font-size: 13px;
    line-height: 1.4;
    color: var(--foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }
</style>
