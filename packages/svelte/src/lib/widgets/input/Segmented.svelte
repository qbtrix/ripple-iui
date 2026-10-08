<!-- src/lib/widgets/input/Segmented.svelte
     A pill track of mutually exclusive (radiogroup/radio) or toggled
     (group/checkbox, `multiple`) options. One aria-hidden thumb slides under the
     selected segment in single mode; in multiple mode, or when the value matches
     no option, there is no thumb and selected segments paint their own surface.
     Options take an optional icon (Lucide slug), `badge` (a small accent count
     pill), `class` and `disabled`; the `leading` snippet renders before each
     option's icon so a host can mark one (a category dot).
     Overflow: labels never wrap (whitespace-nowrap) and the track is capped at
     its container (max-w-full) and scrolls sideways when the options do not fit,
     so a long option list can never spill over the rows below it. Segments stay
     equal width, so the thumb maths (100% / columns) holds while scrolled.
     Keyboard (single mode): one tab stop, the selected option or else the first
     enabled one (roving tabindex). Arrows move focus AND select like native
     radios: Left/Up previous, Right/Down next, wrapping at the ends; Home/End
     jump; disabled options are skipped. Multiple mode is a group of checkboxes,
     each its own tab stop, toggled with Space/Enter.
     origin: slev12397/beautiful-ui@ff0f74d components/atoms/SegmentedControl.tsx -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import * as icons from '@lucide/svelte';

  type Option =
    | string
    | { value: string | number; label: string; icon?: string; disabled?: boolean; badge?: string | number; class?: string };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    options?: Option[];
    /** Selected value (single) or array of values (multiple). */
    value?: string | number | (string | number)[] | null;
    multiple?: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    onchange?: (value: unknown) => void;
    /** Rendered before each option's icon; gets the normalized option. */
    leading?: Snippet<[{ value: string | number; label: string; [k: string]: unknown }]>;
  }

  let {
    id,
    class: className,
    style,
    label,
    options = [],
    value = null,
    multiple = false,
    size = 'md',
    disabled = false,
    onchange,
    leading
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const normalized = $derived(canonicalOptions(options, { widget: 'segmented', key: 'options' }));

  function isSelected(v: string | number): boolean {
    if (multiple) return Array.isArray(value) && value.includes(v);
    return value === v;
  }

  function pick(v: string | number) {
    if (disabled) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      onchange?.(next);
    } else {
      onchange?.(v);
    }
  }

  let track = $state<HTMLDivElement | null>(null);
  const off = (o: unknown) => !!(o as { disabled?: boolean }).disabled;
  const ARROW: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  // Radio mode's one tab stop: the selected option, else the first enabled one.
  const tabStop = $derived.by(() => {
    const i = normalized.findIndex((o) => o.value === value && !off(o));
    return i >= 0 ? i : normalized.findIndex((o) => !off(o));
  });

  function onkeydown(e: KeyboardEvent, from: number) {
    if (multiple || disabled) return;
    const n = normalized.length;
    const step = ARROW[e.key];
    let to = -1;
    if (step) {
      for (let k = 1; k < n && to < 0; k++) {
        const i = (((from + step * k) % n) + n) % n;
        if (!off(normalized[i])) to = i;
      }
    } else if (e.key === 'Home') to = normalized.findIndex((o) => !off(o));
    else if (e.key === 'End') to = normalized.findLastIndex((o) => !off(o));
    else return;
    e.preventDefault();
    if (to < 0) return;
    pick(normalized[to].value);
    track?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus();
  }

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  const sizeClass = $derived(size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]');
  const padClass = $derived(size === 'sm' ? 'px-2.5' : 'px-3');

  // repeat(0, …) is invalid CSS, so an empty options list still needs one track.
  const columns = $derived(Math.max(1, normalized.length));
  // Thumb position. -1 (no match) hides it rather than parking it on segment 0.
  const selectedIndex = $derived(
    multiple ? -1 : normalized.findIndex((o) => o.value === value)
  );
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}

  <div
    bind:this={track}
    {id}
    role={multiple ? 'group' : 'radiogroup'}
    class={cn(
      // w-fit is kept from the pre-skin version: the source renders standalone,
      // but here the track is a child of a column flex, which would stretch it.
      'relative inline-grid w-fit max-w-full select-none overflow-x-auto rounded-full bg-ripple-border/60 p-0.5 [scrollbar-width:none]',
      sizeClass,
      disabled && 'opacity-50 cursor-not-allowed'
    )}
    style="grid-template-columns: repeat({columns}, 1fr);"
  >
    {#if selectedIndex >= 0}
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full bg-ripple-surface ring-1 ring-ripple-border transition-transform duration-200 ease-ripple-out motion-reduce:transition-none"
        style="width: calc((100% - 4px) / {columns}); transform: translateX({selectedIndex * 100}%);"
      ></span>
    {/if}

    {#each normalized as opt, i (opt.value)}
      {@const selected = isSelected(opt.value)}
      {@const Icon = getIcon((opt as any).icon)}
      <button
        type="button"
        role={multiple ? 'checkbox' : 'radio'}
        aria-checked={selected}
        disabled={disabled || (opt as any).disabled}
        tabindex={multiple ? undefined : i === tabStop ? 0 : -1}
        onclick={() => pick(opt.value)}
        onkeydown={(e) => onkeydown(e, i)}
        class={cn(
          'relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-150 ease-ripple-out',
          padClass,
          selected
            ? 'text-ripple-surface-foreground'
            : 'text-ripple-muted-foreground hover:text-ripple-surface-foreground',
          // No sliding thumb in multiple mode — the segment paints its own surface.
          multiple && selected && 'bg-ripple-surface ring-1 ring-ripple-border',
          (opt as any).disabled && 'opacity-50 cursor-not-allowed',
          typeof opt.class === 'string' ? opt.class : undefined
        )}
      >
        {#if leading}{@render leading(opt)}{/if}
        {#if Icon}<Icon size={14} />{/if}
        {opt.label}
        {#if opt.badge != null && opt.badge !== ''}
          <span
            data-segmented-badge
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ripple-accent/15 px-1 text-[10.5px] font-medium leading-none tabular-nums text-ripple-accent"
            >{opt.badge}</span
          >
        {/if}
      </button>
    {/each}
  </div>
</div>
