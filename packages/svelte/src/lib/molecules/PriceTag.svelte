<!--
  PriceTag.svelte — RIPPLE-NATIVE molecule (Wave 1: molecules).
  Created 2026-06-07.
  Adapted from ocean-flow's molecules/PriceTag.svelte, rewired to ripple
  design tokens (ripple-accent / muted-foreground) and Tailwind utilities.

  Price display with an optional original (strikethrough) price and an
  optional discount badge derived from the two numeric values. Pure
  presentation — props in, UI out. No data fetching, no services.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    /** Current price. Numbers get a `$` prefix; strings with a leading
     *  currency symbol ($, €, £) pass through untouched. */
    price: string | number;
    /** Optional pre-discount price, rendered struck-through before `price`. */
    originalPrice?: string | number;
    /** Show a computed "-N%" discount chip when both prices are numeric. */
    showDiscount?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    price,
    originalPrice,
    showDiscount = true,
    size = 'md',
    class: className = '',
  }: Props = $props();

  function formatPrice(value: string | number): string {
    const str = String(value);
    if (/^[$€£]/.test(str)) return str;
    return `$${str}`;
  }

  /** Parse a price-ish value to a number, stripping currency/grouping chars. */
  function toNumber(value: string | number | undefined): number | null {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const discountPct = $derived.by(() => {
    if (!showDiscount || originalPrice == null) return null;
    const now = toNumber(price);
    const was = toNumber(originalPrice);
    if (now == null || was == null || was <= 0 || now >= was) return null;
    return Math.round((1 - now / was) * 100);
  });

  const currentSize = $derived(
    { sm: 'text-sm', md: 'text-base sm:text-lg', lg: 'text-xl sm:text-2xl' }[size],
  );
  const originalSize = $derived(
    { sm: 'text-[11px]', md: 'text-xs sm:text-sm', lg: 'text-sm' }[size],
  );
</script>

<div class={cn('flex min-w-0 items-baseline gap-1.5', className)}>
  {#if originalPrice != null}
    <span class={cn('shrink-0 text-muted-foreground line-through', originalSize)}>
      {formatPrice(originalPrice)}
    </span>
  {/if}
  <span
    class={cn('truncate font-bold text-ripple-accent', currentSize)}
    title={formatPrice(price)}
  >
    {formatPrice(price)}
  </span>
  {#if discountPct != null}
    <span
      class="shrink-0 rounded-full bg-ripple-success/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ripple-success"
    >
      -{discountPct}%
    </span>
  {/if}
</div>
