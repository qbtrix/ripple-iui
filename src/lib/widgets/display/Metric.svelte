<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/ui/badge/index.js';

  interface Props {
    label: string;
    value: string | number;
    trend?: string;
    description?: string;
    /** Layout direction */
    variant?: 'default' | 'compact' | 'horizontal';
    class?: string;
  }

  let {
    label, value, trend, description,
    variant = 'default', class: className
  }: Props = $props();

  const trendVariant = $derived(
    trend?.startsWith('+') ? 'default' as const
    : trend?.startsWith('-') ? 'destructive' as const
    : 'secondary' as const
  );
</script>

{#if variant === 'horizontal'}
  <div class={cn('flex items-center justify-between gap-4', className)}>
    <span class="text-sm text-muted-foreground">{label}</span>
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold font-mono tabular-nums">{value}</span>
      {#if trend}<Badge variant={trendVariant} class="text-[10px] px-1.5 py-0">{trend}</Badge>{/if}
    </div>
  </div>
{:else if variant === 'compact'}
  <div class={cn('flex items-baseline gap-2', className)}>
    <span class="text-lg font-semibold font-mono tabular-nums">{value}</span>
    {#if trend}<Badge variant={trendVariant} class="text-[10px] px-1.5 py-0">{trend}</Badge>{/if}
    <span class="text-xs text-muted-foreground ml-auto">{label}</span>
  </div>
{:else}
  <div class={cn('flex flex-col gap-1', className)}>
    <span class="text-xs font-medium text-muted-foreground">{label}</span>
    <div class="flex items-baseline gap-2">
      <span class="text-2xl font-bold font-mono tabular-nums">{value}</span>
      {#if trend}<Badge variant={trendVariant} class="text-[10px] px-1.5 py-0">{trend}</Badge>{/if}
    </div>
    {#if description}<span class="text-xs text-muted-foreground">{description}</span>{/if}
  </div>
{/if}
