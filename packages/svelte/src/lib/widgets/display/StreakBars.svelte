<!--
  src/lib/widgets/display/StreakBars.svelte
  Created 2026-06-13 (feat/console-telemetry-widgets): nullframe-style streak row.
  A row of discrete segments, each colored per a values[] array (or all one color
  for a simple streak). Drives the amber "CLEAN RUN" streak indicator. Pure CSS —
  fully SSR-safe, no JS.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  type Seg = number | { intensity?: number; color?: string; on?: boolean };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /**
     * Either a count of segments (with `filled` controlling how many are lit),
     * or an explicit array of per-segment values/objects.
     */
    values?: Seg[];
    /** When `values` is omitted, render `count` segments. Default 14. */
    count?: number;
    /** When using `count`, how many leading segments are lit. Default = count. */
    filled?: number;
    /** Base segment color. Default the accent (amber) token. */
    color?: string;
    /** Segment height in px. Default 14. */
    height?: number;
    /** Gap in px. Default 3. */
    gap?: number;
  }

  let {
    id,
    class: className,
    style,
    values,
    count = 14,
    filled,
    color = 'var(--accent)',
    height = 14,
    gap = 3,
  }: Props = $props();

  type Resolved = { key: number; bg: string; opacity: number };

  const segments = $derived.by<Resolved[]>(() => {
    if (values && values.length) {
      return values.map((v, i) => {
        if (typeof v === 'number') {
          const lit = v > 0;
          return { key: i, bg: color, opacity: lit ? Math.min(1, 0.3 + v * 0.7) : 0.1 };
        }
        const on = v.on ?? (v.intensity ?? 0) > 0;
        return {
          key: i,
          bg: v.color ?? color,
          opacity: on ? Math.min(1, 0.3 + (v.intensity ?? 1) * 0.7) : 0.1,
        };
      });
    }
    const lit = filled ?? count;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      bg: color,
      opacity: i < lit ? 1 : 0.1,
    }));
  });

  const styleString = $derived(
    [`gap: ${gap}px`, style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '']
      .filter(Boolean)
      .join(';')
  );
</script>

<div
  {id}
  class={cn('flex w-full items-center', className)}
  style={styleString}
  role="img"
  aria-label="Streak"
>
  {#each segments as s (s.key)}
    <span
      class="flex-1 rounded-[1px]"
      style="height:{height}px; background:{s.bg}; opacity:{s.opacity}"
    ></span>
  {/each}
</div>
