<!--
  src/lib/widgets/display/LedClock.svelte
  Created 2026-06-13 (feat/console-telemetry-widgets): nullframe-style dot-matrix
  LED readout. Renders each character as a 5×7 grid of dots — lit dots take the
  accent/foreground color, unlit cells render as faint placeholder dots (the
  signature "ghost segment" look). Drives a live clock via setInterval when
  `time` is set (client-only; SSR paints a static first frame; reduced-motion
  freezes to that frame and never ticks). Accepts an optional dim sub-readout
  (the "ms" ticker). Hero widget of the console telemetry pack.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Static text/number to render (e.g. "100", "41"). Ignored when `time` is true. */
    value?: string | number;
    /** When true, renders a live HH:MM clock that ticks every second. */
    time?: boolean;
    /** Include seconds in the live clock (HH:MM:SS). Default false. */
    seconds?: boolean;
    /** Small dim sub-readout to the right of the matrix (e.g. a ms ticker). */
    sub?: string | number;
    /** Auto-tick the sub-readout 00..99 (the nullframe ms counter). */
    subTick?: boolean;
    /** Caption label below the matrix. */
    label?: string;
    /** Lit-dot color. Default the foreground token. */
    accent?: string;
    /** Dot diameter in px. Drives overall size. Default 6. */
    dot?: number;
  }

  let {
    id,
    class: className,
    style,
    value = '',
    time = false,
    seconds = false,
    sub,
    subTick = false,
    label,
    accent = 'var(--foreground)',
    dot = 6,
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // ── 5×7 dot-matrix glyph font ──────────────────────────────────────────
  // Each glyph is 7 rows of a 5-char string; '1' = lit, '0' = unlit.
  const FONT: Record<string, string[]> = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    '%': ['11001', '11010', '00100', '01000', '10110', '00011', '00011'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  };
  const ROWS = 7;
  const COLS = 5;

  function glyphFor(ch: string): string[] {
    return FONT[ch] ?? FONT[ch.toUpperCase()] ?? FONT[' '];
  }

  // ── Live clock state ───────────────────────────────────────────────────
  function clockString(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return seconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }

  // Seed a deterministic-enough first frame for SSR (no Date drift mismatch
  // matters here — the matrix re-renders identically on hydrate, then ticks).
  // The props are read once to seed; the $effect blocks + interval below keep
  // them reactive, so the one-time-capture warning is intentional here.
  // svelte-ignore state_referenced_locally
  let display = $state(time ? clockString() : String(value));
  // svelte-ignore state_referenced_locally
  let subDisplay = $state(sub !== undefined ? String(sub) : '');

  // Keep static value/sub reactive when not in live mode.
  $effect(() => {
    if (!time) display = String(value);
  });
  $effect(() => {
    if (!subTick && sub !== undefined) subDisplay = String(sub);
  });

  onMount(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Paint the true current time once on mount (covers reduced-motion too).
    if (time) display = clockString();
    if (reduce) return; // freeze — no interval scheduled

    let subN = 0;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (time) display = clockString();
      if (subTick) {
        subN = (subN + 1) % 100;
        subDisplay = String(subN).padStart(2, '0');
      }
    }, 1000);

    // Faster ms-style sub ticker for the nullframe "08" feel.
    let subInterval: ReturnType<typeof setInterval> | undefined;
    if (subTick) {
      subInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        subN = (subN + 1) % 100;
        subDisplay = String(subN).padStart(2, '0');
      }, 120);
    }

    return () => {
      clearInterval(interval);
      if (subInterval) clearInterval(subInterval);
    };
  });

  const chars = $derived(display.split(''));
  const subChars = $derived(subDisplay.split(''));

  const gap = $derived(Math.max(1, Math.round(dot * 0.34)));
  const subDot = $derived(Math.max(2, Math.round(dot * 0.5)));
  const subGap = $derived(Math.max(1, Math.round(subDot * 0.34)));
</script>

<div
  {id}
  class={cn('inline-flex flex-col gap-3', className)}
  style={styleString}
  role="timer"
  aria-label={label ?? (time ? 'Clock' : 'Readout')}
  aria-live="off"
>
  <div class="flex items-end gap-4">
    <!-- main matrix -->
    <div class="flex items-start" style="gap:{dot}px" aria-hidden="true">
      {#each chars as ch, ci (ci + '-' + ch)}
        {@const glyph = glyphFor(ch)}
        {@const narrow = ch === ':' || ch === '.'}
        <div
          class="grid"
          style="
            grid-template-columns: repeat({narrow ? 2 : COLS}, {dot}px);
            grid-template-rows: repeat({ROWS}, {dot}px);
            gap: {gap}px;
          "
        >
          {#each glyph as rowStr, r (r)}
            {#each rowStr.split('').slice(0, narrow ? 2 : COLS) as cell, c (c)}
              <span
                class="rounded-[1px]"
                style="
                  width:{dot}px; height:{dot}px;
                  background:{cell === '1' ? accent : 'var(--foreground)'};
                  opacity:{cell === '1' ? 1 : 0.07};
                "
              ></span>
            {/each}
          {/each}
        </div>
      {/each}
    </div>

    <!-- dim sub-readout (the ms ticker) -->
    {#if subDisplay}
      <div class="flex items-start pb-1" style="gap:{subDot}px" aria-hidden="true">
        {#each subChars as ch, ci (ci + '-' + ch)}
          {@const glyph = glyphFor(ch)}
          {@const narrow = ch === ':' || ch === '.'}
          <div
            class="grid"
            style="
              grid-template-columns: repeat({narrow ? 2 : COLS}, {subDot}px);
              grid-template-rows: repeat({ROWS}, {subDot}px);
              gap: {subGap}px;
            "
          >
            {#each glyph as rowStr, r (r)}
              {#each rowStr.split('').slice(0, narrow ? 2 : COLS) as cell, c (c)}
                <span
                  class="rounded-[1px]"
                  style="
                    width:{subDot}px; height:{subDot}px;
                    background:var(--muted-foreground);
                    opacity:{cell === '1' ? 0.55 : 0.08};
                  "
                ></span>
              {/each}
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if label}
    <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </span>
  {/if}
</div>
