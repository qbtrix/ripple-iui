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
  @a11y `role="status"` wraps the label only, so a change of label is
    announced. The elapsed timer sits outside the live region: it is readable
    on demand but never announced. The grid is decorative and aria-hidden. Under
    prefers-reduced-motion the grid freezes to its dim state — the source's own
    behaviour — while the timer keeps ticking, because elapsed time is
    information rather than decoration.
    FIXED 2026-09-17: the grid never animated. Each cell named its keyframe in
    an inline `style:animation`, but Svelte renames a component's keyframes to
    a hashed name and rewrites only the references inside its own stylesheet,
    so the inline value pointed at a keyframe that did not exist and the
    browser silently dropped it. The animation now lives on `.ripple-pixel-lit`
    in the stylesheet; each cell passes only `--delay`, and the grid passes
    `--dur`, the same custom-property stagger ToolCall and TaskRows use with
    `--i`. Rejected: marking the keyframe global, which would let it collide
    with any other keyframe of the same name on the page.
  FIXED 2026-09-17 (pre-merge review): the status role sat on the whole row,
    which holds a timer that re-renders every 100ms, so a screen reader got a
    queue of "0.1s, 0.2s..." for as long as the agent worked. The role moved to
    a wrapper around the label. Rejected: `aria-hidden` on the timer inside
    the region. The region is implicitly aria-atomic, and a browser may still
    re-read the whole region, label included, on every hidden mutation.
  FIXED 2026-09-17 (pre-merge review): the elapsed time counted interval
    callbacks, and browsers throttle intervals in background tabs, so after a
    tab switch it showed far less time than had passed. It is now computed
    from a performance.now() stamp taken on mount; the interval only drives
    the re-render. The minute rollover and the unmount cleanup are unchanged.
  Modified: 2026-09-25 (chat new-look slice 1) — optional `startedAt` (epoch ms,
    Date.now() scale). A chat host that re-renders its live turn remounts the
    loader, and a mount-relative timer went back to 0.0s. With `startedAt` the
    effect backdates its performance.now() anchor by `Date.now() - startedAt`
    (clamped at 0 for a clock-skewed future stamp) and seeds the display
    before the first tick, so a remount never flashes 0.0s. The effect reads
    `startedAt`, so a new value re-anchors the timer. Absent, the behaviour is
    exactly as before: counted from mount.
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
    /**
     * When the work began, as epoch ms (`Date.now()`). The timer counts from
     * here instead of from mount, so a remount keeps the elapsed time.
     */
    startedAt?: number;
  }

  let { id, class: className, style, label = 'Churning', variant = 'drive', startedAt }: Props = $props();

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

  // Deciseconds since mount, read off the clock. The interval only schedules
  // the re-render: a background tab throttles it to about once a second, so
  // counting its callbacks would under-report. performance.now() because it is
  // monotonic, so a system clock change cannot move it. The timer is
  // information, so it runs under reduced motion too. The only reactive read is
  // `startedAt`: when given, the anchor is backdated by the wall-clock time
  // already spent, and a new value re-anchors. `tenths` is only written here.
  let tenths = $state(0);
  $effect(() => {
    const start = performance.now() - (startedAt == null ? 0 : Math.max(0, Date.now() - startedAt));
    const tick = () => (tenths = Math.floor((performance.now() - start) / 100));
    tick(); // seed now, so a remount does not show 0.0s until the first tick
    const t = setInterval(tick, 100);
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
  class={cn('ripple-pixel-loader flex w-fit items-center gap-2.5', className)}
  style={styleString}
>
  <span
    aria-hidden="true"
    class="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]"
    style:--dur="{pattern.dur}ms"
  >
    {#each pattern.delays as delay, i (i)}
      <span
        class={cn(
          'ripple-pixel-cell size-[4px] bg-ripple-surface-foreground',
          pattern.round ? 'rounded-full' : 'rounded-[1px]',
          delay !== null && 'ripple-pixel-lit'
        )}
        style:opacity={delay === null ? 0.07 : 0.15}
        style:--delay={delay === null ? undefined : `${delay}ms`}
      ></span>
    {/each}
  </span>

  <!-- The live region holds the label only. Shimmer takes no role prop, so the
       role sits on a wrapper; `flex` keeps Shimmer a flex item as before. -->
  <span role="status" class="flex shrink-0">
    <Shimmer class="w-fit shrink-0 text-[13px] font-medium" duration={1.4} width="60px">
      {label}
    </Shimmer>
  </span>

  <span class="font-mono text-[12px] tabular-nums text-ripple-muted-foreground">{elapsed}</span>
</span>

<style>
  /* The keyframe is named here and only here. Svelte hashes the keyframe and
     rewrites this reference with it; the cells pass only their timing, through
     --delay and --dur. Unlit cells (the orbit's centre) never get the class. */
  .ripple-pixel-lit {
    animation: ripple-loader-pixel-on var(--dur) ease-in-out var(--delay) infinite;
  }
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
     freeze mid-way to. The timer keeps running; it is not decoration.
     Same specificity as the lit rule and later in source, so it already wins;
     !important keeps it winning if the lit selector ever grows. */
  @media (prefers-reduced-motion: reduce) {
    .ripple-pixel-cell {
      animation: none !important;
    }
  }
</style>
