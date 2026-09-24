<!--
  src/lib/widgets/display/GlyphGrid.svelte
  Created 2026-06-13 (feat/console-telemetry-widgets): nullframe-style glyph
  matrix. An N×N grid of cells lit per a bitmap pattern — either a 2D 0/1 array
  or a named built-in glyph. Lit cells take the accent color at varying intensity;
  a subtle CSS pulse breathes the lit cells (frozen under prefers-reduced-motion).
  Pure CSS grid — fully SSR-safe, no JS engine, renders identically static on the
  server. Cells can carry a brightness 0..1 for the nullframe "dithered" look.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  type Row = Array<number>;

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** 2D array of brightness values (0 = unlit, >0 = lit at that intensity). */
    pattern?: Row[];
    /** Named built-in glyph if no explicit pattern is given. */
    glyph?: 'n1' | 'nerve' | 'paw' | 'wave' | 'check' | 'block';
    /** Override grid columns (otherwise derived from the pattern width). */
    cols?: number;
    /** Override grid rows. */
    rows?: number;
    /** Lit-cell color. Default the foreground token. */
    color?: string;
    /** Cell size in px. Default 14. */
    cell?: number;
    /** Animate a subtle pulse on lit cells. Default true. */
    pulse?: boolean;
  }

  let {
    id,
    class: className,
    style,
    pattern,
    glyph = 'n1',
    cols,
    rows,
    color = 'var(--foreground)',
    cell = 14,
    pulse = true,
  }: Props = $props();

  // ── Named glyphs (brightness grids; values 0..3 → mapped to opacity) ────
  const GLYPHS: Record<string, number[][]> = {
    // "N1" mark — a stylized N beside a 1.
    n1: [
      [3, 0, 0, 3, 0, 0, 1, 1, 0],
      [3, 2, 0, 3, 0, 1, 0, 1, 0],
      [3, 0, 2, 3, 0, 0, 0, 1, 0],
      [3, 0, 0, 3, 0, 0, 0, 1, 0],
      [3, 0, 0, 3, 0, 0, 0, 1, 0],
      [3, 0, 0, 3, 0, 1, 1, 1, 1],
    ],
    // A diamond "nerve" node burst.
    nerve: [
      [0, 0, 0, 2, 0, 0, 0],
      [0, 0, 2, 3, 2, 0, 0],
      [0, 2, 3, 3, 3, 2, 0],
      [2, 3, 3, 3, 3, 3, 2],
      [0, 2, 3, 3, 3, 2, 0],
      [0, 0, 2, 3, 2, 0, 0],
      [0, 0, 0, 2, 0, 0, 0],
    ],
    // A paw print.
    paw: [
      [0, 2, 0, 0, 2, 0],
      [2, 3, 0, 2, 3, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 2, 3, 3, 2, 0],
      [2, 3, 3, 3, 3, 2],
      [0, 2, 3, 3, 2, 0],
    ],
    wave: [
      [0, 0, 1, 1, 0, 0, 0, 0],
      [0, 1, 2, 2, 1, 0, 0, 1],
      [1, 2, 3, 3, 2, 1, 1, 2],
      [2, 3, 3, 3, 3, 2, 2, 3],
    ],
    check: [
      [0, 0, 0, 0, 0, 3],
      [0, 0, 0, 0, 3, 2],
      [3, 0, 0, 3, 2, 0],
      [2, 3, 3, 2, 0, 0],
      [0, 2, 2, 0, 0, 0],
    ],
    block: [
      [3, 3, 3, 3],
      [3, 1, 1, 3],
      [3, 1, 1, 3],
      [3, 3, 3, 3],
    ],
  };

  const grid = $derived<number[][]>(pattern ?? GLYPHS[glyph] ?? GLYPHS.n1);
  const nCols = $derived(cols ?? (grid[0]?.length ?? 1));
  const nRows = $derived(rows ?? grid.length);

  // Flatten to cells with brightness; map brightness 0..3 → opacity.
  const cells = $derived(
    grid.flatMap((row, r) =>
      row.map((b, c) => ({
        key: `${r}-${c}`,
        lit: b > 0,
        opacity: b <= 0 ? 0.06 : b === 1 ? 0.35 : b === 2 ? 0.6 : 1,
        // Stagger the pulse so lit cells breathe out of phase.
        delay: ((r * 7 + c) % 9) * 120,
      }))
    )
  );
</script>

<div
  {id}
  class={cn('inline-grid', className)}
  style={[
    `grid-template-columns: repeat(${nCols}, ${cell}px)`,
    `grid-template-rows: repeat(${nRows}, ${cell}px)`,
    `gap: ${Math.max(2, Math.round(cell * 0.2))}px`,
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
  ].filter(Boolean).join(';')}
  role="img"
  aria-label="Glyph matrix"
>
  {#each cells as c (c.key)}
    <span
      class={cn('rounded-[2px]', c.lit && pulse && 'glyph-pulse')}
      style="background:{color}; opacity:{c.opacity}; animation-delay:{c.delay}ms"
    ></span>
  {/each}
</div>

<style>
  .glyph-pulse {
    animation: glyph-breathe 2.6s ease-in-out infinite;
  }
  @keyframes glyph-breathe {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.5); }
  }
  @media (prefers-reduced-motion: reduce) {
    .glyph-pulse { animation: none; }
  }
</style>
