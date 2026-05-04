<script lang="ts">
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';
  import { ArrowUp, ArrowDown, Minus } from '@lucide/svelte';

  type DirectionInput = 'up' | 'down' | 'neutral' | 'auto' | 'up-good' | 'down-good';
  type DirectionResolved = 'up' | 'down' | 'neutral';
  type Sentiment = 'positive' | 'negative' | 'neutral';

  interface Props {
    id?: string;
    class?: string;
    label?: string;
    value: number | string;
    format?: 'number' | 'currency' | 'percent' | 'compact';
    currency?: string;
    locale?: string;
    precision?: number;
    delta?: number;
    deltaPercent?: number;
    deltaFormat?: 'absolute' | 'percent' | 'both';
    direction?: DirectionInput;
    size?: 'sm' | 'md' | 'lg';
    align?: 'left' | 'right';
  }

  let {
    id,
    class: className,
    label,
    value,
    format = 'number',
    currency = 'USD',
    locale,
    precision,
    delta,
    deltaPercent,
    deltaFormat = 'percent',
    direction = 'auto',
    size = 'md',
    align = 'left',
  }: Props = $props();

  function formatValue(v: number | string): string {
    if (typeof v === 'string') return v;
    const opts: Intl.NumberFormatOptions = {};
    if (precision !== undefined) {
      opts.minimumFractionDigits = precision;
      opts.maximumFractionDigits = precision;
    }
    switch (format) {
      case 'currency':
        opts.style = 'currency';
        opts.currency = currency;
        if (precision === undefined) {
          opts.minimumFractionDigits = 2;
          opts.maximumFractionDigits = 2;
        }
        break;
      case 'percent':
        opts.style = 'percent';
        if (precision === undefined) {
          opts.maximumFractionDigits = 1;
        }
        break;
      case 'compact':
        opts.notation = 'compact';
        break;
    }
    return new Intl.NumberFormat(locale, opts).format(v);
  }

  function resolveDirection(): { dir: DirectionResolved; sentiment: Sentiment } {
    const referenceDelta = delta ?? deltaPercent ?? 0;
    if (direction === 'up') return { dir: 'up', sentiment: 'positive' };
    if (direction === 'down') return { dir: 'down', sentiment: 'negative' };
    if (direction === 'neutral') return { dir: 'neutral', sentiment: 'neutral' };
    if (direction === 'auto') {
      if (referenceDelta > 0) return { dir: 'up', sentiment: 'positive' };
      if (referenceDelta < 0) return { dir: 'down', sentiment: 'negative' };
      return { dir: 'neutral', sentiment: 'neutral' };
    }
    if (direction === 'up-good') {
      if (referenceDelta > 0) return { dir: 'up', sentiment: 'positive' };
      if (referenceDelta < 0) return { dir: 'down', sentiment: 'negative' };
      return { dir: 'neutral', sentiment: 'neutral' };
    }
    // down-good: up = bad, down = good
    if (referenceDelta > 0) return { dir: 'up', sentiment: 'negative' };
    if (referenceDelta < 0) return { dir: 'down', sentiment: 'positive' };
    return { dir: 'neutral', sentiment: 'neutral' };
  }

  function formatDelta(): string {
    const absPart =
      delta !== undefined ? `${delta > 0 ? '+' : ''}${formatValue(delta)}` : '';
    const pctPart =
      deltaPercent !== undefined
        ? `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`
        : '';
    if (deltaFormat === 'absolute') return absPart || pctPart;
    if (deltaFormat === 'percent') return pctPart || absPart;
    if (absPart && pctPart) return `${absPart} (${pctPart})`;
    return absPart || pctPart;
  }

  const resolved = $derived(resolveDirection());
  const hasDelta = $derived(delta !== undefined || deltaPercent !== undefined);
  const displayValue = $derived(formatValue(value));
  const displayDelta = $derived(hasDelta ? formatDelta() : '');

  const root = tv({
    base: 'flex flex-col min-w-0',
    variants: {
      size: {
        sm: 'gap-[2px]',
        md: 'gap-1',
        lg: 'gap-1.5',
      },
      align: {
        left: 'items-start text-left',
        right: 'items-end text-right',
      },
    },
    defaultVariants: { size: 'md', align: 'left' },
  });

  const labelCls = tv({
    base: 'text-muted-foreground font-medium',
    variants: {
      size: { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' },
    },
    defaultVariants: { size: 'md' },
  });

  const valueCls = tv({
    base: 'font-semibold font-mono tabular-nums leading-tight',
    variants: {
      size: { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' },
    },
    defaultVariants: { size: 'md' },
  });

  const deltaCls = tv({
    base: 'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
    variants: {
      sentiment: {
        positive: 'text-ripple-success bg-ripple-success/10',
        negative: 'text-ripple-error bg-ripple-error/10',
        neutral: 'text-muted-foreground bg-muted',
      },
    },
    defaultVariants: { sentiment: 'neutral' },
  });

  const iconSize = $derived(size === 'sm' ? 12 : size === 'lg' ? 14 : 12);
</script>

<div
  {id}
  class={cn(root({ size, align }), className)}
  data-size={size}
  data-direction={resolved.dir}
  data-sentiment={resolved.sentiment}
>
  {#if label}
    <span class={labelCls({ size })}>{label}</span>
  {/if}
  <div class="flex items-center gap-2 min-w-0">
    <span class={valueCls({ size })}>{displayValue}</span>
    {#if hasDelta}
      <span data-slot="stat-delta" class={deltaCls({ sentiment: resolved.sentiment })}>
        {#if resolved.dir === 'up'}
          <ArrowUp size={iconSize} strokeWidth={2.5} />
        {:else if resolved.dir === 'down'}
          <ArrowDown size={iconSize} strokeWidth={2.5} />
        {:else}
          <Minus size={iconSize} strokeWidth={2.5} />
        {/if}
        <span>{displayDelta}</span>
      </span>
    {/if}
  </div>
</div>
