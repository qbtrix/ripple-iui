<!--
  widgets/input/ChoiceGrid.svelte
  A single-choice grid of compact cards: a document size picker, a template
  picker, any "pick one of N" where each option deserves a picture. On `./ui`.
  - Each option: `value`, `label`, optional `detail` (the exact size, a short
    note) and `thumb: {width, height}`, which draws a small page whose
    proportions match (portrait, landscape and square read at a glance). A
    `media` snippet replaces the built-in page for custom art.
  - a11y: role="radiogroup" of role="radio" cards with a roving tabindex; the
    arrow keys move AND select (native radio behaviour; up/down move a row),
    Home/End go to the ends, disabled options are skipped.
  - `columns` sets a fixed count; default is auto-fill at `minCardWidth`.
  - Why not OptionList: that is a roomy p-4 icon card with no roving focus or
    thumbnail; this is dense, keyboard-first and proportional.
  Tokens only.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { ChoiceOption } from './choice-grid.js';

  interface Props {
    options: ChoiceOption[];
    value?: string | null;
    onchange?: (value: string) => void;
    /** Accessible name of the group. */
    label?: string;
    columns?: number;
    minCardWidth?: string;
    media?: Snippet<[ChoiceOption, boolean]>;
    class?: string;
  }

  let {
    options,
    value = $bindable(null),
    onchange,
    label,
    columns,
    minCardWidth = '6.5rem',
    media,
    class: className,
  }: Props = $props();

  let root = $state<HTMLDivElement | null>(null);

  // The tab stop is the selected card, else the first enabled one.
  const focusIndex = $derived.by(() => {
    const i = options.findIndex((o) => o.value === value && !o.disabled);
    return i >= 0 ? i : options.findIndex((o) => !o.disabled);
  });

  function pick(o: ChoiceOption) {
    if (o.disabled) return;
    value = o.value;
    onchange?.(o.value);
  }

  /** How many cards sit on one row right now (for up/down). */
  function perRow(): number {
    if (columns) return columns;
    const cards = root?.querySelectorAll<HTMLElement>('[role="radio"]');
    if (!cards || cards.length < 2) return 1;
    const top = cards[0].offsetTop;
    let n = 0;
    for (const c of cards) {
      if (c.offsetTop !== top) break;
      n++;
    }
    return Math.max(1, n);
  }

  function onkeydown(e: KeyboardEvent, from: number) {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow(), ArrowUp: -perRow() };
    let to = -1;
    if (e.key in step) {
      const d = step[e.key];
      for (let i = from + d; i >= 0 && i < options.length; i += Math.sign(d)) {
        if (!options[i].disabled) {
          to = i;
          break;
        }
      }
    } else if (e.key === 'Home') to = options.findIndex((o) => !o.disabled);
    else if (e.key === 'End') to = options.findLastIndex((o) => !o.disabled);
    else return;
    e.preventDefault();
    if (to < 0) return;
    pick(options[to]);
    root?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus();
  }

  /** The page thumbnail box, fitted inside 40 x 32. */
  function thumbBox(t: { width: number; height: number }) {
    const s = Math.min(40 / Math.max(t.width, 1e-6), 32 / Math.max(t.height, 1e-6));
    return { w: Math.max(6, Math.round(t.width * s)), h: Math.max(6, Math.round(t.height * s)) };
  }
</script>

<div
  bind:this={root}
  role="radiogroup"
  aria-label={label}
  data-slot="choice-grid"
  class={cn('grid gap-2', className)}
  style:grid-template-columns={columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(${minCardWidth}, 1fr))`}
>
  {#each options as o, i (o.value)}
    {@const selected = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={o.disabled || undefined}
      tabindex={i === focusIndex ? 0 : -1}
      onclick={() => pick(o)}
      onkeydown={(e) => onkeydown(e, i)}
      class={cn(
        'group/choice flex min-w-0 flex-col items-center gap-2 rounded-lg px-2 pb-2 pt-3 text-center outline-none ring-1 transition-[background-color,box-shadow,color] duration-150 ease-ripple-out',
        'focus-visible:ring-2 focus-visible:ring-ripple-ring',
        selected
          ? 'bg-ripple-accent/10 ring-ripple-accent text-ripple-surface-foreground'
          : 'bg-ripple-surface ring-ripple-border text-ripple-surface-foreground hover:bg-ripple-muted/60',
        o.disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span class="flex h-8 w-10 items-center justify-center" aria-hidden="true">
        {#if media}
          {@render media(o, selected)}
        {:else if o.thumb}
          {@const b = thumbBox(o.thumb)}
          <span
            class={cn(
              'block rounded-[2px] ring-1 shadow-sm transition-colors',
              selected ? 'bg-ripple-accent/30 ring-ripple-accent' : 'bg-ripple-surface-foreground/15 ring-ripple-surface-foreground/25 group-hover/choice:bg-ripple-surface-foreground/25'
            )}
            style:width="{b.w}px"
            style:height="{b.h}px"
          ></span>
        {:else}
          <span class="block size-6 rounded-[2px] border border-dashed border-ripple-muted-foreground/60"></span>
        {/if}
      </span>
      <span class="flex w-full min-w-0 flex-col gap-0.5">
        <span class="truncate text-[12px] font-medium leading-tight">{o.label}</span>
        {#if o.detail}<span class="truncate text-[11px] leading-tight tabular-nums text-ripple-muted-foreground">{o.detail}</span>{/if}
      </span>
    </button>
  {/each}
</div>
