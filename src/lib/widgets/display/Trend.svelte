<!-- src/lib/widgets/display/Trend.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import MinusIcon from '@lucide/svelte/icons/minus';

  type Format = 'percent' | 'number' | 'currency';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value: number;
    format?: Format;
    currency?: string;
    arrow?: boolean;
    precision?: number;
  }

  let {
    id, class: className, style,
    value, format = 'percent', currency = 'USD',
    arrow = true, precision = 1
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const numeric = $derived(typeof value === 'number' ? value : Number(value) || 0);

  const sign = $derived(numeric > 0 ? 'up' : numeric < 0 ? 'down' : 'flat');

  const toneClass = $derived(
    sign === 'up' ? 'text-ripple-success'
    : sign === 'down' ? 'text-ripple-error'
    : 'text-muted-foreground'
  );

  const formatted = $derived.by(() => {
    const abs = Math.abs(numeric);
    if (format === 'percent') return `${numeric > 0 ? '+' : numeric < 0 ? '-' : ''}${abs.toFixed(precision)}%`;
    if (format === 'currency') {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: precision
        }).format(numeric);
      } catch {
        return `${numeric > 0 ? '+' : numeric < 0 ? '-' : ''}${abs.toFixed(precision)}`;
      }
    }
    return `${numeric > 0 ? '+' : numeric < 0 ? '-' : ''}${abs.toFixed(precision)}`;
  });
</script>

<span {id} class={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', toneClass, className)} style={styleString}>
  {#if arrow}
    {#if sign === 'up'}
      <ArrowUpIcon size={12} />
    {:else if sign === 'down'}
      <ArrowDownIcon size={12} />
    {:else}
      <MinusIcon size={12} />
    {/if}
  {/if}
  <span>{formatted}</span>
</span>
