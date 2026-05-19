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
    <label for={id} class="text-sm font-medium text-foreground">{label}</label>
  {/if}

  <div
    class={cn(
      'inline-flex h-9 w-full max-w-[14rem] items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs transition-shadow',
      'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <button
      type="button"
      onclick={() => bump(-step)}
      aria-label="Decrement"
      class={cn(
        'flex w-9 shrink-0 items-center justify-center border-r border-input text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground active:bg-muted/70',
        'focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40'
      )}
      disabled={disabled || cantDecrement}
    >
      <MinusIcon size={14} />
    </button>
    <input
      {id}
      type="text"
      inputmode="decimal"
      aria-label={label}
      {placeholder}
      {disabled}
      value={display}
      oninput={onInput}
      class={cn(
        'min-w-0 flex-1 bg-transparent px-2 text-center text-sm tabular-nums outline-none',
        'placeholder:text-muted-foreground/60',
        'disabled:cursor-not-allowed'
      )}
    />
    <button
      type="button"
      onclick={() => bump(step)}
      aria-label="Increment"
      class={cn(
        'flex w-9 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground active:bg-muted/70',
        'focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40'
      )}
      disabled={disabled || cantIncrement}
    >
      <PlusIcon size={14} />
    </button>
  </div>
</div>
