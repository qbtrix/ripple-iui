<!--
  @file widgets/ai/PixelLoader.svelte
  @description NEW (beautiful-ui re-skin arc, skin-answer lane, 2026-09-16). The
    source's loader for long-running agent work: a 3×3 pixel grid with a
    travelling wavefront, a shimmering label, and a live elapsed timer in mono
    tabular figures. Three variants — `drive` (square cells, a chevron front
    driving right on a 650ms cycle shorter than the sweep, so two fronts are
    always in flight), `dots` (the same wavefront, round cells) and `orbit` (a
    comet lapping the perimeter on 950ms, centre cell dark).

    WHY IT IS NEW, and not a re-skin of `display/Loading.svelte`. Loading is the
    library's generic spinner — a lucide ring plus an optional label, registered
    in the spec registry with a manifest entry, and reached by every existing
    spec that says "loading". Swapping its interior for a pixel grid would change
    every one of those call sites, and the variant picker and the elapsed timer
    are props it does not have, i.e. a manifest shape change. `Skeleton.svelte`
    is a different job again: placeholder blocks standing in for content that has
    not parsed yet, not a status readout for work in flight. So Loading stays the
    generic spinner, Skeleton stays the placeholder, and this is the agent-work
    status line — which is why it sits in `widgets/ai/` beside the surfaces it
    belongs to.

    NOT REGISTERED, same placement rule as TaskRows, PromptBar and AnswerBlock:
    re-exported from `src/lib/ui/index.ts` with no spec-registry entry and no
    manifest entry, so the manifest still reports 189 widgets.

    DROPPED FROM THE SOURCE: the `Surfer` variant, which pairs the loader with an
    autoplaying meme video hosted on someone else's blob store. A library
    component does not fetch third-party media.

    The label reuses `premium/Shimmer` rather than pasting a fifth sweep
    keyframe — the translation table's row 1 calls shimmer a reuse, and this is
    the reuse.
  @a11y `role="status"` on the row, so the label and the elapsed time are
    announced. The grid is decorative and aria-hidden. Under
    prefers-reduced-motion the grid freezes to its dim state — the source's own
    behaviour — while the timer keeps ticking, because elapsed time is
    information rather than decoration.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/LoadingState.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Shimmer from '$lib/widgets/premium/Shimmer.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** What the agent is doing. */
    label?: string;
    /** `drive` / `dots` — a chevron wavefront. `orbit` — a comet on the rim. */
    variant?: 'drive' | 'dots' | 'orbit';
  }

  let { id, class: className, style, label = 'Churning', variant = 'drive' }: Props = $props();

  // The chevron wavefront: delay grows with the column and with the distance
  // from the middle row, which is what bends the front into a chevron.
  const CHEVRON = Array.from({ length: 9 }, (_, i) => ((i % 3) + Math.abs(Math.floor(i / 3) - 1)) * 90);
  // The comet: the perimeter in clockwise order. The centre cell (4) is absent,
  // which is what `null` means below — a dark cell that never lights.
  const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
  const ORBIT = Array.from({ length: 9 }, (_, i) => {
    const k = ORBIT_ORDER.indexOf(i);
    return k === -1 ? null : k * 110;
  });

  const PATTERNS = {
    drive: { delays: CHEVRON, dur: 650, round: false },
    dots: { delays: CHEVRON, dur: 650, round: true },
    orbit: { delays: ORBIT, dur: 950, round: false },
  } as const;

  const pattern = $derived(PATTERNS[variant] ?? PATTERNS.drive);

  // Deciseconds since mount. The timer is information, so it runs under reduced
  // motion too. Reads nothing reactive on setup — `tenths` is written from the
  // interval callback, which is not tracked.
  let tenths = $state(0);
  $effect(() => {
    const t = setInterval(() => (tenths += 1), 100);
    return () => clearInterval(t);
  });

  const elapsed = $derived.by(() => {
    const total = tenths / 10;
    if (total < 60) return `${total.toFixed(1)}s`;
    return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<span
  {id}
  data-ripple-node={id}
  data-variant={variant}
  role="status"
  class={cn('ripple-pixel-loader flex w-fit items-center gap-2.5', className)}
  style={styleString}
>
  <span aria-hidden="true" class="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
    {#each pattern.delays as delay, i (i)}
      <span
        class={cn(
          'ripple-pixel-cell size-[4px] bg-ripple-surface-foreground',
          pattern.round ? 'rounded-full' : 'rounded-[1px]'
        )}
        style:opacity={delay === null ? 0.07 : 0.15}
        style:animation={delay === null
          ? 'none'
          : `ripple-loader-pixel-on ${pattern.dur}ms ease-in-out ${delay}ms infinite`}
      ></span>
    {/each}
  </span>

  <Shimmer class="w-fit shrink-0 text-[13px] font-medium" duration={1.4} width="60px">
    {label}
  </Shimmer>

  <span class="font-mono text-[12px] tabular-nums text-ripple-muted-foreground">{elapsed}</span>
</span>

<style>
  @keyframes ripple-loader-pixel-on {
    0%,
    100% {
      opacity: 0.15;
    }
    50% {
      opacity: 1;
    }
  }
  /* The source freezes the grid to its dim state rather than leaving a cell
     lit — the wavefront is the information, and without it there is nothing to
     freeze mid-way to. The timer keeps running; it is not decoration. */
  @media (prefers-reduced-motion: reduce) {
    .ripple-pixel-cell {
      animation: none !important;
    }
  }
</style>
