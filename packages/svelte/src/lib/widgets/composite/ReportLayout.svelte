<!--
  @file ReportLayout.svelte
  @description Printable structured-document layout: branded header (logo +
  title + meta block), report body via children, optional footer with notes.
  Used for monthly reports, audit findings, financial summaries, status
  reports, contract reviews. Includes print-friendly CSS and a "Print" action
  by default; hosts can override via `actions`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  interface MetaItem {
    label: string;
    value: string;
    icon?: string;
  }

  interface Action {
    id?: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'outline' | 'ghost';
    actions?: EventHandlerOrArray;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    subtitle?: string;
    logo?: string;
    /** Brand name shown next to / under logo. */
    brand?: string;
    meta?: MetaItem[];
    footer?: string;
    /** Show a "Print" action by default. Off when `actions` is provided. */
    showPrintAction?: boolean;
    actions?: Action[];
    /** Optional watermark like "DRAFT" or "CONFIDENTIAL". */
    watermark?: string;
    /** Constrain body width to a print-friendly column. Default true. */
    paperWidth?: boolean;
    children?: Snippet;
    hasChildren?: boolean;
    onaction?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    subtitle,
    logo,
    brand,
    meta: rawMeta = [],
    footer,
    showPrintAction = true,
    actions: rawActions,
    watermark,
    paperWidth = true,
    children,
    hasChildren = false,
    onaction
  }: Props = $props();

  const meta = $derived(safeArray<MetaItem>(rawMeta, { widget: 'report-layout', key: 'meta' }));
  const actions = $derived(
    rawActions === undefined
      ? undefined
      : safeArray<Action>(rawActions, { widget: 'report-layout', key: 'actions' })
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const VARIANT_CLASS: Record<NonNullable<Action['variant']>, string> = {
    default: 'rreport-btn-primary',
    outline: 'rreport-btn-outline',
    ghost: 'rreport-btn-ghost'
  };

  function fireAction(a: Action) {
    if (a.actions && eventDispatcher) {
      const handlers = Array.isArray(a.actions) ? a.actions : [a.actions];
      void eventDispatcher.dispatch(handlers as EventHandler[], { state: stateManager?.state ?? {} }, a.id);
      return;
    }
    if (a.id) onaction?.(a.id);
  }

  function handlePrint() {
    if (typeof window !== 'undefined') window.print();
  }
</script>

<div {id} class={cn('rreport', paperWidth && 'rreport-paper', className)} style={styleString}>
  {#if watermark}
    <div class="rreport-watermark" aria-hidden="true">{watermark}</div>
  {/if}

  <header class="rreport-header">
    <div class="rreport-brand">
      {#if logo}
        <img src={logo} alt={brand ?? 'Logo'} class="rreport-logo" />
      {/if}
      {#if brand}
        <span class="rreport-brand-name">{brand}</span>
      {/if}
    </div>

    <div class="rreport-actions rreport-print-hide">
      {#if actions && actions.length > 0}
        {#each actions as a}
          <button type="button" class={cn('rreport-btn', VARIANT_CLASS[a.variant ?? 'default'])} onclick={() => fireAction(a)}>
            {#if a.icon}<Icon name={a.icon} size={14} />{/if}
            <span>{a.label}</span>
          </button>
        {/each}
      {:else if showPrintAction}
        <button type="button" class="rreport-btn rreport-btn-outline" onclick={handlePrint}>
          <Icon name="printer" size={14} />
          <span>Print / Save as PDF</span>
        </button>
      {/if}
    </div>
  </header>

  <div class="rreport-title-block">
    <h1 class="rreport-title">{title}</h1>
    {#if subtitle}
      <p class="rreport-subtitle">{subtitle}</p>
    {/if}
  </div>

  {#if meta.length > 0}
    <dl class="rreport-meta">
      {#each meta as m}
        <div class="rreport-meta-item">
          <dt class="rreport-meta-label">
            {#if m.icon}<Icon name={m.icon} size={11} />{/if}
            {m.label}
          </dt>
          <dd class="rreport-meta-value">{m.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}

  <div class="rreport-divider"></div>

  <main class="rreport-body">
    {#if hasChildren && children}
      {@render children()}
    {/if}
  </main>

  {#if footer}
    <footer class="rreport-footer">
      <p>{footer}</p>
    </footer>
  {/if}
</div>

<style>
  .rreport {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 28px 32px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
  }
  .rreport-paper {
    max-width: 880px;
    margin-left: auto;
    margin-right: auto;
  }

  .rreport-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    user-select: none;
    font-size: 96px;
    font-weight: 800;
    letter-spacing: 0.18em;
    color: color-mix(in oklab, var(--muted-foreground) 22%, transparent);
    transform: rotate(-22deg);
    z-index: 0;
  }

  .rreport-header,
  .rreport-title-block,
  .rreport-meta,
  .rreport-divider,
  .rreport-body,
  .rreport-footer {
    position: relative;
    z-index: 1;
  }

  .rreport-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .rreport-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--muted-foreground);
    font-size: 13px;
  }
  .rreport-logo {
    height: 28px;
    width: auto;
    object-fit: contain;
  }
  .rreport-brand-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--foreground);
    letter-spacing: -0.01em;
  }

  .rreport-title-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rreport-title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .rreport-subtitle {
    font-size: 14px;
    color: var(--muted-foreground);
    margin: 0;
  }

  .rreport-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px 18px;
    padding: 14px 16px;
    border-radius: 10px;
    background: color-mix(in oklab, var(--muted) 35%, transparent);
    margin: 0;
  }
  .rreport-meta-item {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rreport-meta-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-foreground);
    margin: 0;
  }
  .rreport-meta-value {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--foreground);
    margin: 0;
  }

  .rreport-divider {
    height: 1px;
    background: var(--border);
  }

  .rreport-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .rreport-footer {
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-top: 8px;
  }
  .rreport-footer p {
    font-size: 11.5px;
    color: var(--muted-foreground);
    margin: 0;
    line-height: 1.6;
  }

  .rreport-actions {
    display: flex;
    gap: 8px;
  }
  .rreport-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .rreport-btn-primary {
    background: oklch(0.55 0.18 250);
    color: white;
  }
  .rreport-btn-outline {
    background: transparent;
    color: var(--foreground);
    border: 1px solid var(--border);
  }
  .rreport-btn-outline:hover {
    background: var(--muted);
  }
  .rreport-btn-ghost {
    background: transparent;
    color: var(--foreground);
  }
  .rreport-btn-ghost:hover {
    background: var(--muted);
  }

  @media print {
    .rreport {
      border: 0;
      background: white;
      color: black;
      padding: 0;
      box-shadow: none;
    }
    .rreport-print-hide {
      display: none !important;
    }
    .rreport-watermark {
      color: rgba(0, 0, 0, 0.06);
    }
    @page {
      margin: 18mm 16mm;
    }
  }
</style>
