<script lang="ts">
  import { cn } from '$lib/utils.js';
  import StarIcon from '@lucide/svelte/icons/star';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    value?: number;
    /** Number of stars in the scale (default 5). */
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    showValue?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, label, value = 0, max = 5,
    size = 'md', disabled = false, showValue = false, onchange
  }: Props = $props();

  const numericValue = $derived(typeof value === 'number' ? value : Number(value) || 0);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const iconSize = $derived({ sm: 14, md: 18, lg: 22 }[size]);

  function handleClick(rank: number) {
    // Click the same star twice to clear (rate=0).
    const next = rank === numericValue ? 0 : rank;
    onchange?.(next);
  }
</script>

<div class={cn('flex flex-col gap-1', className)} style={styleString} {id}>
  {#if label}
    <span class="text-sm font-medium leading-none">{label}</span>
  {/if}
  <div class="flex items-center gap-0.5" role="radiogroup" aria-label={label ?? 'Rating'}>
    {#each Array(max) as _, i}
      {@const rank = i + 1}
      {@const filled = rank <= numericValue}
      <button
        type="button"
        role="radio"
        aria-checked={filled}
        aria-label={`Rate ${rank}`}
        {disabled}
        onclick={() => !disabled && handleClick(rank)}
        class={cn(
          'inline-flex items-center justify-center rounded-md p-0.5 transition-colors',
          'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
          filled ? 'text-amber-500' : 'text-muted-foreground'
        )}
      >
        <StarIcon size={iconSize} fill={filled ? 'currentColor' : 'none'} />
      </button>
    {/each}
    {#if showValue}
      <span class="ml-2 text-xs text-muted-foreground tabular-nums">{numericValue} / {max}</span>
    {/if}
  </div>
</div>
