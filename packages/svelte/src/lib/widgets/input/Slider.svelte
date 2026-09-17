<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Slider } from '$lib/components/ui/slider/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    showValue?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, label, value = 0,
    min = 0, max = 100, step = 1, disabled = false, showValue = true,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const numericValue = $derived(typeof value === 'number' ? value : Number(value) || 0);

  // bits-ui type="single" reports the value as a single number; multi as number[].
  function handleChange(v: number | number[]) {
    onchange?.(Array.isArray(v) ? v[0] : v);
  }
</script>

<div class={cn('flex flex-col gap-2 w-full', className)} style={styleString} {id}>
  {#if label || showValue}
    <div class="flex items-center justify-between text-sm">
      {#if label}
        <span class="font-medium leading-none">{label}</span>
      {:else}
        <span></span>
      {/if}
      {#if showValue}
        <span class="text-muted-foreground tabular-nums">{value}</span>
      {/if}
    </div>
  {/if}
  <Slider
    type="single"
    value={numericValue}
    {min}
    {max}
    {step}
    {disabled}
    onValueChange={handleChange}
  />
</div>
