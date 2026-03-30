<script lang="ts">
  import { cn } from '../../utils.js';
  import { faviconUrl } from './favicon.js';

  interface Props {
    /** Source/publisher name */
    source: string;
    /** Dot/accent color — fallback if favicon fails */
    color?: string;
    /** Override favicon URL (auto-derived from source name if omitted) */
    favicon?: string;
    /** Optional superscript citation number */
    number?: number;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
  }

  let {
    source, color = 'hsl(var(--primary))', favicon, number,
    url, class: className, onclick
  }: Props = $props();

  const iconSrc = $derived(favicon ?? faviconUrl(source));
  let iconError = $state(false);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<span
  class={cn('rcite', className)}
  onclick={onclick ?? (url ? () => window.open(url, '_blank') : undefined)}
  role={onclick || url ? 'button' : undefined}
  tabindex={onclick || url ? 0 : undefined}
>
  {#if !iconError}
    <img src={iconSrc} alt="" class="rcite-favicon" onerror={() => iconError = true} />
  {:else}
    <span class="rcite-dot" style="background:{color}"></span>
  {/if}
  <span class="rcite-name">{source}</span>
  {#if number != null}
    <sup class="rcite-num">{number}</sup>
  {/if}
</span>

<style>
  .rcite {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 4px;
    background: hsl(var(--muted) / 0.5);
    font-size: 11px;
    line-height: 1.4;
    vertical-align: baseline;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .rcite[role='button'] {
    cursor: pointer;
  }
  .rcite[role='button']:hover {
    background: hsl(var(--muted));
  }
  .rcite-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .rcite-favicon {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .rcite-name {
    color: hsl(var(--muted-foreground));
    font-weight: 500;
  }
  .rcite-num {
    font-size: 9px;
    color: hsl(var(--muted-foreground) / 0.7);
    margin-left: 1px;
  }
</style>
