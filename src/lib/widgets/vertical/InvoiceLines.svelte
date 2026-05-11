<!-- src/lib/widgets/vertical/InvoiceLines.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  type Line = {
    id?: string | number;
    description: string;
    quantity?: number;
    unitPrice?: number;
    /** Pre-computed total. If omitted, computed as quantity * unitPrice. */
    total?: number;
    /** Optional secondary text under description. */
    note?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    lines?: Line[];
    /** Currency symbol. */
    currency?: string;
    /** Tax/discount/shipping rows shown after subtotal. */
    summary?: { label: string; value: number; isNegative?: boolean }[];
    /** Override the auto-computed subtotal. */
    subtotal?: number;
    /** Override the auto-computed grand total. */
    total?: number;
    /** Show row totals column. */
    showRowTotals?: boolean;
  }

  let {
    id,
    class: className,
    style,
    lines = [],
    currency = '$',
    summary = [],
    subtotal,
    total,
    showRowTotals = true
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function rowTotal(l: Line): number {
    if (typeof l.total === 'number') return l.total;
    if (typeof l.quantity === 'number' && typeof l.unitPrice === 'number') {
      return l.quantity * l.unitPrice;
    }
    return 0;
  }

  function format(n: number): string {
    const sign = n < 0 ? '-' : '';
    return `${sign}${currency}${Math.abs(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  const computedSubtotal = $derived(
    typeof subtotal === 'number' ? subtotal : lines.reduce((acc, l) => acc + rowTotal(l), 0)
  );
  const computedTotal = $derived(
    typeof total === 'number'
      ? total
      : computedSubtotal +
        summary.reduce((acc, s) => acc + (s.isNegative ? -Math.abs(s.value) : s.value), 0)
  );
</script>

<div
  {id}
  class={cn('rounded-md border border-border overflow-hidden', className)}
  style={styleString}
>
  <table class="w-full text-sm">
    <thead class="bg-muted/30">
      <tr>
        <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
        <th class="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">Qty</th>
        <th class="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">Unit</th>
        {#if showRowTotals}
          <th class="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Total</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each lines as line, i (line.id ?? i)}
        <tr class="border-t border-border">
          <td class="px-3 py-2 align-top">
            <div>{line.description}</div>
            {#if line.note}
              <div class="text-xs text-muted-foreground mt-0.5">{line.note}</div>
            {/if}
          </td>
          <td class="px-3 py-2 text-right tabular-nums align-top">
            {typeof line.quantity === 'number' ? line.quantity : ''}
          </td>
          <td class="px-3 py-2 text-right tabular-nums align-top">
            {typeof line.unitPrice === 'number' ? format(line.unitPrice) : ''}
          </td>
          {#if showRowTotals}
            <td class="px-3 py-2 text-right tabular-nums align-top font-medium">
              {format(rowTotal(line))}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
    <tfoot class="bg-muted/20 border-t-2 border-border">
      <tr>
        <td colspan={showRowTotals ? 3 : 2} class="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
          Subtotal
        </td>
        <td class="px-3 py-2 text-right tabular-nums">{format(computedSubtotal)}</td>
      </tr>
      {#each summary as s (s.label)}
        <tr>
          <td colspan={showRowTotals ? 3 : 2} class="px-3 py-1.5 text-right text-xs uppercase tracking-wide text-muted-foreground">
            {s.label}
          </td>
          <td class="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
            {format(s.isNegative ? -Math.abs(s.value) : s.value)}
          </td>
        </tr>
      {/each}
      <tr class="border-t border-border">
        <td colspan={showRowTotals ? 3 : 2} class="px-3 py-2.5 text-right text-sm font-semibold uppercase tracking-wide">
          Total
        </td>
        <td class="px-3 py-2.5 text-right tabular-nums text-base font-semibold">{format(computedTotal)}</td>
      </tr>
    </tfoot>
  </table>
</div>
