<!-- src/lib/widgets/input/NumberInput.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Numeric value. Bind via `bind: "<state-path>"`. */
    value?: number | null;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    disabled?: boolean;
    /** Format the input text — useful for currency, percentages, etc. */
    formatter?: (v: number) => string;
    /** Parse user input back into a number. */
    parser?: (raw: string) => number;
    onchange?: (value: number) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = 0,
    min,
    max,
    step = 1,
    placeholder,
    disabled = false,
    formatter,
    parser,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function clamp(n: number) {
    if (typeof min === 'number' && n < min) return min;
    if (typeof max === 'number' && n > max) return max;
    return n;
  }

  function emit(n: number) {
    onchange?.(clamp(n));
  }

  function bump(delta: number) {
    const cur = typeof value === 'number' ? value : 0;
    emit(cur + delta);
  }

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    const n = parser ? parser(raw) : Number(raw);
    if (!Number.isNaN(n)) emit(n);
  }

  const display = $derived.by(() => {
    if (value === null || value === undefined) return '';
    if (formatter && typeof value === 'number') return formatter(value);
    return String(value);
  });

  const cantDecrement = $derived(typeof min === 'number' && typeof value === 'number' && value <= min);
  const cantIncrement = $derived(typeof max === 'number' && typeof value === 'number' && value >= max);
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label for={id} class="text-sm font-medium">{label}</label>
  {/if}

  <div
    class={cn(
      'inline-flex items-stretch rounded-md border border-input bg-ripple-input shadow-xs overflow-hidden',
      'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <button
      type="button"
      onclick={() => bump(-step)}
      aria-label="Decrement"
      class="px-2 hover:bg-muted disabled:opacity-40 transition-colors border-r border-input"
      disabled={disabled || cantDecrement}
    >
      <MinusIcon size={14} />
    </button>
    <input
      {id}
      type="text"
      inputmode="decimal"
      {placeholder}
      {disabled}
      value={display}
      oninput={onInput}
      class="w-20 bg-transparent text-center tabular-nums text-sm outline-none"
    />
    <button
      type="button"
      onclick={() => bump(step)}
      aria-label="Increment"
      class="px-2 hover:bg-muted disabled:opacity-40 transition-colors border-l border-input"
      disabled={disabled || cantIncrement}
    >
      <PlusIcon size={14} />
    </button>
  </div>
</div>
