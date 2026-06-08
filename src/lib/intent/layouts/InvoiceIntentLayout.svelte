<!--
  InvoiceIntentLayout.svelte — intent-layout wrapper for InvoiceLayout composite.
  Created 2026-06-07.
  Routes `display.layout='invoice'` specs to the ripple InvoiceLayout composite
  widget. Reads the invoice payload directly from `spec.data` (the composite's
  required fields: from, billTo, invoiceNumber, issueDate, lines). Provides sane
  defaults so a missing field doesn't crash the render — the spec owner is
  responsible for supplying the invoice data. PURE — no fetch.
  No top-level $state (child-only; avoids repo $state flake).
-->
<script lang="ts">
  import InvoiceLayout from '$lib/widgets/composite/InvoiceLayout.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  const rawData = $derived(
    (input.spec as unknown as { data?: Record<string, unknown> }).data ?? {},
  );

  // Required fields — surface an empty-state when the spec is missing them so
  // a mis-configured spec never shows a broken form.
  const hasRequiredFields = $derived(
    !!(rawData as any).from && !!(rawData as any).billTo && !!(rawData as any).lines,
  );

  const FALLBACK_PARTY = { name: 'Unknown' };
  const invoiceData = $derived({
    from: (rawData as any).from ?? FALLBACK_PARTY,
    billTo: (rawData as any).billTo ?? FALLBACK_PARTY,
    shipTo: (rawData as any).shipTo,
    invoiceNumber: String((rawData as any).invoiceNumber ?? (rawData as any).invoice_number ?? '—'),
    issueDate: String((rawData as any).issueDate ?? (rawData as any).issue_date ?? ''),
    dueDate: (rawData as any).dueDate ?? (rawData as any).due_date,
    status: (rawData as any).status,
    currency: (rawData as any).currency ?? 'USD',
    lines: (rawData as any).lines ?? [],
    summary: (rawData as any).summary,
    subtotal: (rawData as any).subtotal,
    total: (rawData as any).total,
    notes: (rawData as any).notes ?? input.description,
    paymentTerms: (rawData as any).paymentTerms ?? (rawData as any).payment_terms,
    paymentMethods: (rawData as any).paymentMethods,
  });
</script>

{#if !hasRequiredFields}
  <EmptyState
    title="Invoice data missing"
    description="Supply `from`, `billTo`, and `lines` in data to render the invoice."
    icon="file-text"
  />
{:else}
  <InvoiceLayout
    from={invoiceData.from}
    billTo={invoiceData.billTo}
    shipTo={invoiceData.shipTo}
    invoiceNumber={invoiceData.invoiceNumber}
    issueDate={invoiceData.issueDate}
    dueDate={invoiceData.dueDate as any}
    status={invoiceData.status as any}
    currency={invoiceData.currency}
    lines={invoiceData.lines}
    summary={invoiceData.summary}
    subtotal={invoiceData.subtotal}
    total={invoiceData.total}
    notes={invoiceData.notes}
    paymentTerms={invoiceData.paymentTerms}
    paymentMethods={invoiceData.paymentMethods}
  />
{/if}
