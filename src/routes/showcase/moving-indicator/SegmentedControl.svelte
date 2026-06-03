<!--
  src/routes/showcase/moving-indicator/SegmentedControl.svelte
  @file routes/showcase/moving-indicator/SegmentedControl.svelte
  @description SECOND CONSUMER of the generic `movingIndicator` primitive — a
    macOS/iOS-style segmented control where a single pill GLIDES to the SELECTED
    segment. This is the genericity proof: the SAME primitive that drives the
    checkbox-group's hover highlight here drives a tab/segmented selection
    indicator, with a DIFFERENT active source — SELECTION (the bound value), not
    hover. The pill is one `use:movingIndicator` element; the action measures the
    selected segment's offset box and glides the pill's left/width (axis: 'x') to
    it on the FF `fast` (80ms) token. No widget-specific motion code lives here —
    only the look (the muted track, the white pill, the label weight shift).
  @provenance The moving-indicator mechanism is generalized from Fluid
    Functionalism's checkbox-group (MIT); this consumer applies it to a segmented
    control to prove the primitive is widget-agnostic.
  @created 2026-05-30 — RFC 12: movingIndicator second consumer (genericity proof).
-->
<script lang="ts">
  import { movingIndicator } from '$lib/motion/moving-indicator.js';
  import { FF_SPRING_TOKENS } from '$lib/motion/presets.js';

  interface Props {
    /** Segment labels. */
    segments: string[];
    /** Bound selected value (the label). */
    value?: string;
    onchange?: (value: string) => void;
    label?: string;
  }

  let { segments, value = $bindable(segments[0]), onchange, label }: Props = $props();

  let track: HTMLDivElement | null = $state(null);
  const segEls: (HTMLElement | null)[] = [];
  let prefersReduced = $state(false);

  $effect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced = mq.matches;
    const onChange = () => (prefersReduced = mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  // The ACTIVE SOURCE here is SELECTION — the index of the bound value. This is
  // the seam that makes movingIndicator generic: the checkbox-group sources hover,
  // this sources selection, same primitive.
  const selectedIndex = $derived(Math.max(0, segments.indexOf(value)));

  function select(seg: string) {
    value = seg;
    onchange?.(seg);
  }

  function onKeydown(e: KeyboardEvent, i: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = e.key === 'ArrowRight' ? (i + 1) % segments.length : (i - 1 + segments.length) % segments.length;
      segEls[n]?.focus();
      select(segments[n]);
    }
  }
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <span class="text-sm font-medium leading-none">{label}</span>
  {/if}
  <div
    bind:this={track}
    role="tablist"
    aria-label={label}
    class="relative inline-flex w-fit items-center gap-1 rounded-[10px] bg-muted p-1"
  >
    <!-- The gliding pill — the single element driven by movingIndicator. It sits
         BEHIND the segment labels (z-0) and slides its left/width to the selected
         segment. White surface + a soft shadow read it as the raised, selected
         affordance (the classic macOS segmented control). -->
    <div
      class="absolute z-0 rounded-[7px] bg-background shadow-sm"
      data-segmented-pill
      use:movingIndicator={{
        container: () => track,
        items: () => segEls,
        active: selectedIndex,
        token: FF_SPRING_TOKENS.fast,
        axis: 'x',
        reducedMotion: prefersReduced
      }}
    ></div>

    {#each segments as seg, i (seg)}
      {@const isSelected = i === selectedIndex}
      <button
        bind:this={segEls[i]}
        type="button"
        role="tab"
        aria-selected={isSelected}
        tabindex={isSelected ? 0 : -1}
        data-segment={i}
        class="relative z-10 rounded-[7px] px-3.5 py-1 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        style="color:{isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'};"
        onclick={() => select(seg)}
        onkeydown={(e) => onKeydown(e, i)}
      >{seg}</button>
    {/each}
  </div>
</div>
