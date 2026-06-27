<!--
  SourcesBar.svelte — compact bar of source favicons with share/copy actions.
  Modified: 2026-06-09 — a11y fix: make the optional-onclick container a coherent
  keyboard-accessible button via a derived `interactive` spread (role/tabindex/
  onkeydown), plain div otherwise (fixes a11y_no_static_element_interactions). Recipe 1.
  Modified: 2026-06-27 — forward node id (bind id + data-ripple-node on the root)
  for editor selection (SP-0 id-forwarding codemod).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import { getContext } from 'svelte';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';
  import { faviconUrl } from './favicon.js';

  interface SourceRef {
    name: string;
    color?: string;
    favicon?: string;
    url?: string;
  }

  interface Props {
    /** Spec node id, forwarded by NodeRenderer for editor selection. */
    id?: string;
    /** Array of source references */
    sources: SourceRef[];
    /** Override display count (defaults to sources.length) */
    count?: number;
    /** Label text (defaults to "sources") */
    label?: string;
    /** Show share action */
    share?: boolean;
    /** Show copy action */
    copy?: boolean;
    class?: string;
    onclick?: (e?: unknown) => void;
  }

  let {
    id, sources: rawSources = [], count, label = 'sources',
    share = true, copy = true, class: className, onclick
  }: Props = $props();

  const sources = $derived(safeArray<SourceRef>(rawSources, { widget: 'sources-bar', key: 'sources' }));
  const validSources = $derived(sources.filter(s => s?.name));
  const displayCount = $derived(count ?? validSources.length);
  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  function getCtx() {
    return { state: stateManager?.state ?? {} };
  }

  function handleCopy() {
    const text = sources.map(s => s.name + (s.url ? ` (${s.url})` : '')).join('\n');
    navigator.clipboard?.writeText(text);
    eventDispatcher?.dispatch(
      { action: 'toast', message: 'Sources copied', variant: 'success' },
      getCtx(), undefined
    );
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick?.(e);
    }
  }
  const interactive = $derived(
    onclick ? { role: 'button', tabindex: 0, onclick, onkeydown: handleKey } : {}
  );

  function handleShare() {
    const text = sources.map(s => s.name + (s.url ? ` — ${s.url}` : '')).join('\n');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard?.writeText(text);
      eventDispatcher?.dispatch(
        { action: 'toast', message: 'Link copied', variant: 'success' },
        getCtx(), undefined
      );
    }
  }
</script>

<div {id} data-ripple-node={id} class={cn('rsbar', className)} {...interactive}>
  <div class="rsbar-left">
    <div class="rsbar-dots">
      {#each validSources.slice(0, 4) as src, i}
        <img
          src={src.favicon ?? faviconUrl(src.name)}
          alt=""
          class="rsbar-favicon"
          style="z-index:{4 - i}; margin-left:{i > 0 ? '-4px' : '0'}"
        />
      {/each}
    </div>
    <span class="rsbar-count">{displayCount} {label}</span>
  </div>

  <div class="rsbar-actions">
    {#if share}
      <button class="rsbar-btn" onclick={handleShare} title="Share sources">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    {/if}
    {#if copy}
      <button class="rsbar-btn" onclick={handleCopy} title="Copy sources">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .rsbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 2px;
  }
  .rsbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rsbar-dots {
    display: flex;
    align-items: center;
  }
  .rsbar-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid var(--card);
    flex-shrink: 0;
    position: relative;
  }
  .rsbar-favicon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid var(--card);
    flex-shrink: 0;
    position: relative;
    object-fit: cover;
  }
  .rsbar-count {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted-foreground);
  }
  .rsbar-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .rsbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .rsbar-btn:hover {
    background: var(--muted);
    color: var(--foreground);
  }
</style>
