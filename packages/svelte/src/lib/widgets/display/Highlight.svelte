<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
  import TrendingDownIcon from '@lucide/svelte/icons/trending-down';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Big number / value. Strings are rendered verbatim. */
    value: string | number;
    /** Smaller line below the value. */
    label?: string;
    /** Optional context text rendered below the label. */
    description?: string;
    /** Optional delta: "+12.4%", "-3", etc. */
    delta?: string;
    /** Tone for the delta — auto-derives from delta sign if not set. */
    tone?: 'positive' | 'negative' | 'neutral';
  }

  let {
    id, class: className, style,
    value, label, description, delta, tone
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // `delta` is a string-typed prop but a binding can deliver a number — coerce
  // before .trim so the tone auto-derivation never crashes the canvas.
  const deltaText = $derived(asText(delta).trim());
  const resolvedTone = $derived(
    tone ?? (deltaText.startsWith('-') ? 'negative' : deltaText.startsWith('+') ? 'positive' : 'neutral')
  );

  const toneClass = $derived(
    resolvedTone === 'positive' ? 'text-emerald-600 dark:text-emerald-400'
      : resolvedTone === 'negative' ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground'
  );
</script>

<div
  {id}
  class={cn('flex flex-col gap-1 rounded-lg border border-border bg-card/40 p-5', className)}
  style={styleString}
>
  <div class="flex items-baseline gap-3">
    <span class="text-4xl md:text-5xl font-semibold tracking-tight tabular-nums">{value}</span>
    {#if delta}
      <span class={cn('inline-flex items-center gap-0.5 text-sm font-medium', toneClass)}>
        {#if resolvedTone === 'positive'}<TrendingUpIcon size={14} />
        {:else if resolvedTone === 'negative'}<TrendingDownIcon size={14} />
        {/if}
        <span>{delta}</span>
      </span>
    {/if}
  </div>
  {#if label}
    <div class="text-sm font-medium">{label}</div>
  {/if}
  {#if description}
    <p class="text-xs text-muted-foreground">{description}</p>
  {/if}
</div>
