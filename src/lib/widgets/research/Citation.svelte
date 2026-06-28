<!--
  Citation.svelte — inline source citation chip.
  Modified: 2026-06-09 — a11y fix: bundle role/tabindex/onkeydown into a derived
  `interactive` spread so the element is a coherent keyboard-accessible button only
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
    id, source, color = 'var(--primary)', favicon, number,
    url, class: className, onclick
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

<span {id} data-ripple-node={id} class={cn('rcite', className)} {...interactive}>
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
    background: color-mix(in oklab, var(--muted) 50%, transparent);
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
    background: var(--muted);
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
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .rcite-num {
    font-size: 9px;
    color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    margin-left: 1px;
  }
</style>
