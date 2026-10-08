<!-- src/lib/widgets/input/Slider.svelte
     A labelled single-value slider: the label and the current value above a
     ui Slider. The label also names the role="slider" thumb (aria-label).
     Invariant: only a user's pointer or key reaches `onchange`. bits-ui snaps an
     out-of-range or off-step value and reports it as a change; a streamed slider
     can mount before its min/max arrive, and forwarding that snap overwrote the
     bound state (250 -> 100). The thumb shows the clamped value instead, and
     re-derives when min/max change. -->
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

  const displayValue = $derived(Math.min(Math.max(numericValue, min), max));

  // Set by a pointer or key on this slider; bits-ui's own snapping never sets it.
  // Keys change the value synchronously, so the flag clears on the next microtask;
  // a drag holds it until the pointer is released.
  let userInput = false;
  function keyInput() {
    userInput = true;
    queueMicrotask(() => (userInput = false));
  }

  // bits-ui type="single" reports the value as a single number; multi as number[].
  function handleChange(v: number | number[]) {
    if (!userInput) return;
    onchange?.(Array.isArray(v) ? v[0] : v);
  }
</script>

<svelte:window onpointerup={() => (userInput = false)} onpointercancel={() => (userInput = false)} />

<div
  class={cn('flex flex-col gap-2 w-full', className)}
  style={styleString}
  {id}
  onpointerdowncapture={() => (userInput = true)}
  onkeydowncapture={keyInput}
>
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
    value={displayValue}
    {min}
    {max}
    {step}
    {disabled}
    aria-label={label}
    onValueChange={handleChange}
  />
</div>
