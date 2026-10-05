<!-- src/lib/widgets/input/NumberInput.svelte
     A numeric field. Default: label above, -/+ steppers, emits on every
     keystroke. `compact` (dense inspectors): no steppers, the label becomes an
     inline prefix ("X", "W", "pt"), the root fills its row (w-full min-w-0, so a
     lone field lines up with a two-up grid of fields), and it commits on Enter
     or blur, so each edit is one undo step. A cleared field never emits 0.
     The field never shows text it didn't apply: on commit (compact) and on
     change/blur (both modes), empty, unparseable or clamped text is replaced
     by the formatted current `value`.
     `suffix` is a muted unit after the number, inside the box ("mm", "pt", "%", "°"),
     and names the field when there is no label.
     The root is min-w-0 in both modes, so a field in a grid or flex track
     shrinks with it instead of pushing its siblings out of a dialog.
     `name` is rendered on the native input so a static <form> POST submits it. -->
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
    /** Field name for native form submission. Defaults to the bind path via NodeRenderer. */
    name?: string;
    /** Format the input text — useful for currency, percentages, etc. */
    formatter?: (v: number) => string;
    /** Parse user input back into a number. */
    parser?: (raw: string) => number;
    onchange?: (value: number) => void;
    /** Dense inspector field: no stepper buttons, a shorter box, the label as an inline prefix,
     *  and it commits on Enter/blur instead of every keystroke (one undo step per edit). */
    compact?: boolean;
    /** A muted unit shown after the number, inside the box ("mm", "pt", "%"). */
    suffix?: string;
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
    name,
    formatter,
    parser,
    onchange,
    compact = false,
    suffix
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
    if (raw.trim() === '') return; // a cleared field is not a 0
    const n = parser ? parser(raw) : Number(raw);
    if (!Number.isNaN(n)) emit(n);
  }

  /** Show the applied value. Svelte skips the DOM write when `display` is unchanged
   *  (a clamp to the current value, a rejected entry), so write it here. */
  function sync(e: Event) {
    (e.currentTarget as HTMLInputElement).value = display;
  }

  function commit(e: Event) {
    onInput(e);
    sync(e);
  }

  const display = $derived.by(() => {
    if (value === null || value === undefined) return '';
    if (formatter && typeof value === 'number') return formatter(value);
    return String(value);
  });

  const cantDecrement = $derived(typeof min === 'number' && typeof value === 'number' && value <= min);
  const cantIncrement = $derived(typeof max === 'number' && typeof value === 'number' && value >= max);
</script>

<div class={cn('flex min-w-0 flex-col gap-1.5', compact && 'w-full', className)} style={styleString}>
  {#if label && !compact}
    <label for={id} class="text-sm font-medium text-foreground">{label}</label>
  {/if}

  <div
    class={cn(
      'inline-flex h-9 w-full max-w-[14rem] items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs transition-shadow',
      compact && 'h-7 max-w-none',
      'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    {#if compact && label}
      <label for={id} class="flex shrink-0 items-center pl-2 text-xs text-muted-foreground">{label}</label>
    {/if}
    {#if !compact}
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
    {/if}
    <input
      {id}
      {name}
      type="text"
      inputmode="decimal"
      aria-label={label ?? suffix}
      {placeholder}
      {disabled}
      value={display}
      oninput={compact ? undefined : onInput}
      onchange={compact ? commit : sync}
      onblur={sync}
      class={cn(
        'min-w-0 flex-1 bg-transparent px-2 text-center text-sm tabular-nums outline-none',
        compact && 'px-1.5 text-right text-xs',
        'placeholder:text-muted-foreground/60',
        'disabled:cursor-not-allowed'
      )}
    />
    {#if suffix}
      <span data-slot="number-input-suffix" class={cn('flex shrink-0 items-center text-muted-foreground', compact ? 'pr-2 text-xs' : 'pr-2.5 text-sm')}>{suffix}</span>
    {/if}
    {#if !compact}
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
    {/if}
  </div>
</div>
