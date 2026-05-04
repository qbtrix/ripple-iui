<!-- src/lib/widgets/vertical/PricingTable.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';

  type Tier = {
    id: string;
    name: string;
    price: string | number;
    period?: string;
    description?: string;
    features?: (string | { label: string; included?: boolean })[];
    cta?: string;
    popular?: boolean;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    tiers?: Tier[];
    /** Currency symbol prepended to numeric prices. */
    currency?: string;
    onselect?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    tiers = [],
    currency = '$',
    onselect
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function formatPrice(p: string | number): string {
    if (typeof p === 'number') return `${currency}${p}`;
    return p;
  }

  function normalizeFeature(f: string | { label: string; included?: boolean }) {
    return typeof f === 'string' ? { label: f, included: true } : { included: true, ...f };
  }
</script>

<div
  {id}
  class={cn('grid gap-4', className)}
  style={`grid-template-columns: repeat(${Math.max(1, tiers.length)}, minmax(0, 1fr)); ${styleString ?? ''}`}
>
  {#each tiers as tier (tier.id)}
    <div
      class={cn(
        'relative flex flex-col rounded-ripple border p-6 transition-shadow',
        tier.popular ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-ripple-border'
      )}
    >
      {#if tier.popular}
        <span
          class="absolute -top-2.5 right-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
        >
          Most popular
        </span>
      {/if}

      <div class="mb-4">
        <h3 class="text-lg font-semibold">{tier.name}</h3>
        {#if tier.description}
          <p class="text-sm text-muted-foreground mt-1">{tier.description}</p>
        {/if}
      </div>

      <div class="mb-4">
        <span class="text-3xl font-bold tabular-nums">{formatPrice(tier.price)}</span>
        {#if tier.period}
          <span class="text-sm text-muted-foreground ml-1">/{tier.period}</span>
        {/if}
      </div>

      <ul class="flex flex-col gap-2 mb-6 m-0 p-0 list-none flex-1">
        {#each (tier.features ?? []) as raw (typeof raw === 'string' ? raw : raw.label)}
          {@const f = normalizeFeature(raw)}
          <li class={cn('flex items-start gap-2 text-sm', !f.included && 'text-muted-foreground')}>
            {#if f.included}
              <CheckIcon size={16} class="text-primary mt-0.5 shrink-0" />
            {:else}
              <XIcon size={16} class="opacity-40 mt-0.5 shrink-0" />
            {/if}
            <span>{f.label}</span>
          </li>
        {/each}
      </ul>

      <button
        type="button"
        onclick={() => onselect?.(tier.id)}
        class={cn(
          'w-full rounded-md px-4 py-2 text-sm font-medium transition-colors',
          tier.popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border hover:bg-muted/60'
        )}
      >
        {tier.cta ?? 'Choose plan'}
      </button>
    </div>
  {/each}
</div>
