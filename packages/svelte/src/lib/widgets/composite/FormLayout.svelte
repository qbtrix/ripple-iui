<!--
  @file FormLayout.svelte
  @description Multi-section form scaffold: title/description header, side nav
  of section anchors, content slot, optional progress, sticky save bar with
  submit/cancel and a "dirty" / "saving" indicator. Used for onboarding,
  settings, application forms, RFP submissions, account profile, etc.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  interface Section {
    id: string;
    title: string;
    description?: string;
    icon?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    /** Side-nav section anchors. Each section's body in `children` should set id={section.id}. */
    sections?: Section[];
    /** 0..100. Shown next to the title. */
    progress?: number;
    valid?: boolean;
    dirty?: boolean;
    saving?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    submitActions?: EventHandlerOrArray;
    cancelActions?: EventHandlerOrArray;
    showCancel?: boolean;
    stickyBar?: boolean;
    children?: Snippet;
    hasChildren?: boolean;
    onsubmit?: () => void;
    oncancel?: () => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    sections = [],
    progress,
    valid = true,
    dirty = false,
    saving = false,
    submitLabel = 'Save changes',
    cancelLabel = 'Cancel',
    submitActions,
    cancelActions,
    showCancel = true,
    stickyBar = true,
    children,
    hasChildren = false,
    onsubmit,
    oncancel
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  let activeId = $state<string | null>(null);

  $effect(() => {
    if (activeId === null && sections.length > 0) activeId = sections[0].id;
  });

  function fire(handler: EventHandlerOrArray | undefined, fallback?: () => void) {
    if (handler && eventDispatcher) {
      const handlers = Array.isArray(handler) ? handler : [handler];
      void eventDispatcher.dispatch(handlers as EventHandler[], { state: stateManager?.state ?? {} });
      return;
    }
    fallback?.();
  }

  function handleSubmit() {
    if (saving || !valid) return;
    fire(submitActions, onsubmit);
  }
  function handleCancel() {
    fire(cancelActions, oncancel);
  }

  function jumpTo(sId: string) {
    activeId = sId;
    if (typeof document !== 'undefined') {
      const el = document.getElementById(sId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<div {id} class={cn('rform', stickyBar && 'rform-sticky', className)} style={styleString}>
  {#if title || description || progress !== undefined}
    <header class="rform-header">
      <div class="rform-header-main">
        {#if title}
          <h2 class="rform-title">{title}</h2>
        {/if}
        {#if description}
          <p class="rform-description">{description}</p>
        {/if}
      </div>
      {#if progress !== undefined}
        <div class="rform-progress">
          <div class="rform-progress-track">
            <div class="rform-progress-fill" style={`width:${Math.max(0, Math.min(100, progress))}%`}></div>
          </div>
          <span class="rform-progress-label">{Math.round(progress)}%</span>
        </div>
      {/if}
    </header>
  {/if}

  <div class="rform-body">
    {#if sections.length > 0}
      <nav class="rform-nav">
        <div class="rform-nav-inner">
          {#each sections as s}
            <button
              type="button"
              class={cn('rform-nav-item', activeId === s.id && 'rform-nav-item-active')}
              onclick={() => jumpTo(s.id)}
            >
              {#if s.icon}
                <Icon name={s.icon} size={14} />
              {/if}
              <span class="rform-nav-label">
                <span class="rform-nav-title">{s.title}</span>
                {#if s.description}
                  <span class="rform-nav-desc">{s.description}</span>
                {/if}
              </span>
            </button>
          {/each}
        </div>
      </nav>
    {/if}

    <div class="rform-content">
      {#if hasChildren && children}
        {@render children()}
      {/if}
    </div>
  </div>

  <div class={cn('rform-bar', stickyBar && 'rform-bar-sticky')}>
    <div class="rform-bar-status">
      {#if saving}
        <span class="rform-bar-tag rform-bar-tag-info">
          <Icon name="loader-2" size={12} />
          Saving…
        </span>
      {:else if dirty}
        <span class="rform-bar-tag rform-bar-tag-warning">
          <span class="rform-bar-dot"></span>
          Unsaved changes
        </span>
      {/if}
      {#if !valid}
        <span class="rform-bar-tag rform-bar-tag-error">
          <Icon name="alert-circle" size={12} />
          Resolve errors to continue
        </span>
      {/if}
    </div>
    <div class="rform-bar-actions">
      {#if showCancel}
        <button type="button" class="rform-bar-btn rform-bar-btn-ghost" onclick={handleCancel}>
          {cancelLabel}
        </button>
      {/if}
      <button
        type="button"
        class="rform-bar-btn rform-bar-btn-primary"
        onclick={handleSubmit}
        disabled={saving || !valid}
      >
        {submitLabel}
      </button>
    </div>
  </div>
</div>

<style>
  .rform {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .rform-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .rform-header-main {
    flex: 1;
    min-width: 0;
  }
  .rform-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    color: var(--foreground);
  }
  .rform-description {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .rform-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 140px;
  }
  .rform-progress-track {
    width: 100px;
    height: 4px;
    background: var(--muted);
    border-radius: 999px;
    overflow: hidden;
  }
  .rform-progress-fill {
    height: 100%;
    background: oklch(0.55 0.18 250);
    transition: width 0.3s ease;
  }
  .rform-progress-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }

  .rform-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  @media (min-width: 900px) {
    .rform-body {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 32px;
      align-items: start;
    }
  }

  .rform-nav {
    position: sticky;
    top: 16px;
    align-self: start;
  }
  .rform-nav-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .rform-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    color: var(--muted-foreground);
    transition: background 0.12s, color 0.12s;
  }
  .rform-nav-item:hover {
    background: var(--muted);
    color: var(--foreground);
  }
  .rform-nav-item-active {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 12%, transparent);
    color: var(--foreground);
  }
  .rform-nav-label {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .rform-nav-title {
    font-size: 13px;
    font-weight: 500;
  }
  .rform-nav-desc {
    font-size: 11px;
    color: var(--muted-foreground);
  }

  .rform-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .rform-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .rform-bar-sticky {
    position: sticky;
    bottom: 8px;
    z-index: 10;
    backdrop-filter: blur(12px);
    background: color-mix(in oklab, var(--card) 92%, transparent);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
  }
  .rform-bar-status {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .rform-bar-actions {
    display: flex;
    gap: 8px;
  }
  .rform-bar-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid transparent;
  }
  .rform-bar-tag-info {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 10%, transparent);
    color: oklch(0.55 0.18 250);
    border-color: color-mix(in oklab, oklch(0.55 0.18 250) 25%, transparent);
  }
  .rform-bar-tag-warning {
    background: color-mix(in oklab, oklch(0.7 0.18 70) 12%, transparent);
    color: oklch(0.55 0.18 70);
    border-color: color-mix(in oklab, oklch(0.7 0.18 70) 25%, transparent);
  }
  .rform-bar-tag-error {
    background: color-mix(in oklab, oklch(0.65 0.22 25) 10%, transparent);
    color: oklch(0.55 0.22 25);
    border-color: color-mix(in oklab, oklch(0.65 0.22 25) 25%, transparent);
  }
  .rform-bar-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .rform-bar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, opacity 0.15s;
    border: 0;
  }
  .rform-bar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .rform-bar-btn-ghost {
    background: transparent;
    color: var(--foreground);
  }
  .rform-bar-btn-ghost:hover:not(:disabled) {
    background: var(--muted);
  }
  .rform-bar-btn-primary {
    background: oklch(0.55 0.18 250);
    color: white;
  }
  .rform-bar-btn-primary:hover:not(:disabled) {
    background: oklch(0.5 0.18 250);
  }
</style>
