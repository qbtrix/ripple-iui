<!--
  @file InvoiceLayout.svelte
  @description Full invoice / quote / receipt document. Composes the existing
  `invoice-lines` widget for the line items and wraps it with branded header,
  bill-to / ship-to blocks, status badge, totals block, payment instructions,
  notes, and footer. Print-friendly.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import InvoiceLines from '$lib/widgets/vertical/InvoiceLines.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type Status = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

  interface Party {
    name: string;
    logo?: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  }

  interface Line {
    id?: string | number;
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    note?: string;
  }

  interface SummaryLine {
    label: string;
    value: number;
    isNegative?: boolean;
  }

  interface PaymentMethod {
    label: string;
    detail?: string;
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
    docType?: 'Invoice' | 'Quote' | 'Receipt' | 'Credit note';
    from: Party;
    billTo: Party;
    shipTo?: Party;
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    status?: Status;
    currency?: string;
    lines: Line[];
    summary?: SummaryLine[];
    subtotal?: number;
    total?: number;
    notes?: string;
    paymentTerms?: string;
    paymentMethods?: PaymentMethod[];
    actions?: Action[];
    onaction?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    docType = 'Invoice',
    from,
    billTo,
    shipTo,
    invoiceNumber,
    issueDate,
    dueDate,
    status,
    currency = '$',
    lines: rawLines,
    summary: rawSummary = [],
    subtotal,
    total,
    notes,
    paymentTerms,
    paymentMethods: rawPaymentMethods = [],
    actions: rawActions = [],
    onaction
  }: Props = $props();

  const lines = $derived(safeArray<Line>(rawLines, { widget: 'invoice-layout', key: 'lines' }));
  const summary = $derived(safeArray<SummaryLine>(rawSummary, { widget: 'invoice-layout', key: 'summary' }));
  const paymentMethods = $derived(safeArray<PaymentMethod>(rawPaymentMethods, { widget: 'invoice-layout', key: 'paymentMethods' }));
  const actions = $derived(safeArray<Action>(rawActions, { widget: 'invoice-layout', key: 'actions' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const STATUS_CLASS: Record<Status, string> = {
    draft: 'rinv-status-draft',
    sent: 'rinv-status-sent',
    paid: 'rinv-status-paid',
    overdue: 'rinv-status-overdue',
    void: 'rinv-status-void'
  };

  const VARIANT_CLASS: Record<NonNullable<Action['variant']>, string> = {
    default: 'rinv-btn-primary',
    outline: 'rinv-btn-outline',
    ghost: 'rinv-btn-ghost'
  };

  function fireAction(a: Action) {
    if (a.actions && eventDispatcher) {
      const handlers = Array.isArray(a.actions) ? a.actions : [a.actions];
      void eventDispatcher.dispatch(handlers as EventHandler[], { state: stateManager?.state ?? {} }, a.id);
      return;
    }
    if (a.id) onaction?.(a.id);
  }
</script>

<div {id} class={cn('rinv', className)} style={styleString}>
  <header class="rinv-header">
    <div class="rinv-brand">
      {#if from.logo}
        <img src={from.logo} alt={from.name} class="rinv-logo" />
      {/if}
      <div>
        <div class="rinv-brand-name">{from.name}</div>
        {#if from.address}<div class="rinv-brand-line">{from.address}</div>{/if}
        {#if from.email}<div class="rinv-brand-line">{from.email}</div>{/if}
        {#if from.phone}<div class="rinv-brand-line">{from.phone}</div>{/if}
        {#if from.taxId}<div class="rinv-brand-line">Tax ID: {from.taxId}</div>{/if}
      </div>
    </div>
    <div class="rinv-doc">
      <div class="rinv-doc-type">{docType}</div>
      <div class="rinv-doc-num">#{invoiceNumber}</div>
      {#if status}
        <span class={cn('rinv-status', STATUS_CLASS[status])}>{status}</span>
      {/if}
    </div>
  </header>

  <div class="rinv-meta">
    <div class="rinv-meta-block">
      <div class="rinv-meta-label">Bill to</div>
      <div class="rinv-meta-name">{billTo.name}</div>
      {#if billTo.address}<div class="rinv-meta-line">{billTo.address}</div>{/if}
      {#if billTo.email}<div class="rinv-meta-line">{billTo.email}</div>{/if}
      {#if billTo.taxId}<div class="rinv-meta-line">Tax ID: {billTo.taxId}</div>{/if}
    </div>
    {#if shipTo}
      <div class="rinv-meta-block">
        <div class="rinv-meta-label">Ship to</div>
        <div class="rinv-meta-name">{shipTo.name}</div>
        {#if shipTo.address}<div class="rinv-meta-line">{shipTo.address}</div>{/if}
      </div>
    {/if}
    <div class="rinv-meta-block">
      <div class="rinv-meta-row">
        <span class="rinv-meta-label">Issue date</span>
        <span class="rinv-meta-value">{issueDate}</span>
      </div>
      {#if dueDate}
        <div class="rinv-meta-row">
          <span class="rinv-meta-label">Due date</span>
          <span class="rinv-meta-value">{dueDate}</span>
        </div>
      {/if}
      {#if paymentTerms}
        <div class="rinv-meta-row">
          <span class="rinv-meta-label">Terms</span>
          <span class="rinv-meta-value">{paymentTerms}</span>
        </div>
      {/if}
    </div>
  </div>

  <InvoiceLines {lines} {currency} {summary} {subtotal} {total} />

  {#if (notes || paymentMethods.length > 0)}
    <div class="rinv-bottom">
      {#if paymentMethods.length > 0}
        <div class="rinv-pay">
          <div class="rinv-pay-title">Payment methods</div>
          <ul class="rinv-pay-list">
            {#each paymentMethods as m}
              <li>
                <span class="rinv-pay-label">{m.label}</span>
                {#if m.detail}<span class="rinv-pay-detail">{m.detail}</span>{/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if notes}
        <div class="rinv-notes">
          <div class="rinv-notes-title">Notes</div>
          <p class="rinv-notes-body">{notes}</p>
        </div>
      {/if}
    </div>
  {/if}

  {#if actions.length > 0}
    <div class="rinv-actions rinv-print-hide">
      {#each actions as a}
        <button type="button" class={cn('rinv-btn', VARIANT_CLASS[a.variant ?? 'default'])} onclick={() => fireAction(a)}>
          {#if a.icon}<Icon name={a.icon} size={14} />{/if}
          <span>{a.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rinv {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 28px 32px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
    max-width: 880px;
    margin: 0 auto;
  }

  .rinv-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  .rinv-brand {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  .rinv-logo {
    height: 36px;
    width: auto;
    object-fit: contain;
  }
  .rinv-brand-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--foreground);
    margin-bottom: 2px;
  }
  .rinv-brand-line {
    font-size: 11.5px;
    color: var(--muted-foreground);
    line-height: 1.5;
  }
  .rinv-doc {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .rinv-doc-type {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
  }
  .rinv-doc-num {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }
  .rinv-status {
    margin-top: 4px;
    text-transform: uppercase;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .rinv-status-draft {
    background: var(--muted);
    color: var(--muted-foreground);
  }
  .rinv-status-sent {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 12%, transparent);
    color: oklch(0.55 0.18 250);
  }
  .rinv-status-paid {
    background: color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent);
    color: oklch(0.55 0.18 150);
  }
  .rinv-status-overdue {
    background: color-mix(in oklab, oklch(0.55 0.22 25) 14%, transparent);
    color: oklch(0.55 0.22 25);
  }
  .rinv-status-void {
    background: var(--muted);
    color: var(--muted-foreground);
    text-decoration: line-through;
  }

  .rinv-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px 28px;
  }
  .rinv-meta-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rinv-meta-label {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted-foreground);
    margin-bottom: 2px;
  }
  .rinv-meta-name {
    font-weight: 600;
    color: var(--foreground);
    font-size: 13.5px;
  }
  .rinv-meta-line {
    font-size: 12px;
    color: var(--muted-foreground);
    line-height: 1.5;
  }
  .rinv-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    gap: 12px;
  }
  .rinv-meta-row .rinv-meta-label {
    margin: 0;
    color: var(--muted-foreground);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    font-size: 12px;
  }
  .rinv-meta-value {
    color: var(--foreground);
    font-weight: 500;
  }

  .rinv-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  @media (max-width: 640px) {
    .rinv-bottom { grid-template-columns: 1fr; }
  }
  .rinv-pay-title,
  .rinv-notes-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    margin-bottom: 6px;
  }
  .rinv-pay-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rinv-pay-list li {
    font-size: 12.5px;
    color: var(--foreground);
    display: flex;
    flex-direction: column;
  }
  .rinv-pay-label {
    font-weight: 500;
  }
  .rinv-pay-detail {
    color: var(--muted-foreground);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }
  .rinv-notes-body {
    font-size: 12.5px;
    color: var(--foreground);
    margin: 0;
    line-height: 1.55;
  }

  .rinv-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .rinv-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .rinv-btn-primary {
    background: oklch(0.55 0.18 250);
    color: white;
  }
  .rinv-btn-primary:hover {
    background: oklch(0.5 0.18 250);
  }
  .rinv-btn-outline {
    background: transparent;
    color: var(--foreground);
    border: 1px solid var(--border);
  }
  .rinv-btn-outline:hover {
    background: var(--muted);
  }
  .rinv-btn-ghost {
    background: transparent;
    color: var(--foreground);
  }
  .rinv-btn-ghost:hover {
    background: var(--muted);
  }

  @media print {
    .rinv {
      border: 0;
      background: white;
      color: black;
      padding: 0;
      max-width: 100%;
    }
    .rinv-print-hide {
      display: none !important;
    }
    @page {
      margin: 18mm 16mm;
    }
  }
</style>
