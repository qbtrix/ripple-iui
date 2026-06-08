<!--
  ReportIntentLayout.svelte — intent-layout wrapper for ReportLayout composite.
  Created 2026-06-07.
  Routes `display.layout='report'` specs to the ripple ReportLayout composite
  widget. ReportLayout is a document chrome (header, watermark, print action) with
  a `children` snippet for the body. The body renders the adapter's items as a
  simple structured list — each item {title, subtitle/value} becomes a labelled
  row. For richer report bodies the spec should use a raw-ui override.
  PURE — no fetch. No top-level $state (child-only; avoids repo $state flake).
-->
<script lang="ts">
  import ReportLayout from '$lib/widgets/composite/ReportLayout.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  const rawData = $derived(
    (input.spec as unknown as { data?: Record<string, unknown> }).data ?? {},
  );

  const rows = $derived(input.items);
  const fields = $derived(input.fields);

  function field(item: Record<string, unknown>, key: string): unknown {
    const mapped = fields[key];
    return mapped ? item[mapped] : undefined;
  }

  function rowLabel(item: Record<string, unknown>): string {
    return String(field(item, 'title') ?? item.title ?? item.label ?? '');
  }
  function rowValue(item: Record<string, unknown>): string {
    return String(
      field(item, 'subtitle') ?? field(item, 'description') ?? item.value ?? item.subtitle ?? '',
    );
  }

  // Optional meta items (date, author, etc.) from spec.data.meta.
  const meta = $derived(
    Array.isArray((rawData as any).meta) ? (rawData as any).meta : [],
  );
</script>

{#if rows.length === 0 && !input.title}
  <EmptyState
    title="No report data"
    description="Supply data.items or a spec title to render the report."
    icon="file-text"
  />
{:else}
  <ReportLayout
    title={input.title ?? 'Report'}
    subtitle={input.description}
    brand={(rawData as any).brand}
    logo={(rawData as any).logo}
    {meta}
    footer={(rawData as any).footer}
    watermark={(rawData as any).watermark}
    hasChildren={rows.length > 0}
  >
    {#snippet children()}
      {#if rows.length > 0}
        <div class="report-body">
          {#each rows as row, i (i)}
            <div class="report-body__row">
              <dt class="report-body__label">{rowLabel(row)}</dt>
              <dd class="report-body__value">{rowValue(row)}</dd>
            </div>
          {/each}
        </div>
      {/if}
    {/snippet}
  </ReportLayout>
{/if}

<style>
  .report-body {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem 1.5rem;
    padding: 0.5rem 0;
  }
  .report-body__row {
    display: contents;
  }
  .report-body__label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
    padding: 0.375rem 0;
    border-bottom: 1px solid var(--ripple-border, #e5e7eb);
  }
  .report-body__value {
    font-size: 0.875rem;
    color: var(--ripple-foreground, inherit);
    padding: 0.375rem 0;
    border-bottom: 1px solid var(--ripple-border, #e5e7eb);
  }
</style>
