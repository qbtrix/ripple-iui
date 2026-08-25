<!--
  src/lib/widgets/display/FillGrid.svelte
  Created 2026-06-13 (feat/console-telemetry-widgets): nullframe-style heap meter.
  A row (or matrix) of M discrete cells; the first N are "filled" per value/max,
  the rest render as faint ghost cells. Used for the MEMORY/heap and BATTERY-style
  segment readouts. Pure CSS — fully SSR-safe, no JS.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Current value (number of cells to fill = round(value/max * total)). */
    value?: number;
    /** Max value. Default 100. */
    max?: number;
    /** Total number of cells. Default 24. */
    total?: number;
    /** Number of columns. Omit for a single row. */
    cols?: number;
    /** Filled-cell color. Default the primary token. */
    color?: string;
    /** Cell height in px. Default 12. */
    cellHeight?: number;
    /** Gap between cells in px. Default 3. */
    gap?: number;
  }

  let {
    id,
    class: className,
    style,
    value = 0,
    max = 100,
    total = 24,
    cols,
    color = 'var(--primary)',
    cellHeight = 12,
    gap = 3,
  }: Props = $props();

  const filled = $derived(
    Math.max(0, Math.min(total, Math.round((value / (max || 1)) * total)))
  );

  const cells = $derived(
    Array.from({ length: total }, (_, i) => ({ key: i, on: i < filled }))
  );

  const styleString = $derived(
    [
      cols
        ? `grid-template-columns: repeat(${cols}, minmax(0, 1fr))`
        : `grid-template-columns: repeat(${total}, minmax(0, 1fr))`,
      `gap: ${gap}px`,
      style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    ]
      .filter(Boolean)
      .join(';')
  );
</script>

<div
  {id}
  class={cn('grid w-full', className)}
  style={styleString}
  role="meter"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-label="Fill meter"
>
  {#each cells as c (c.key)}
    <span
      class="rounded-[1px]"
      style="height:{cellHeight}px; background:{c.on ? color : 'var(--foreground)'}; opacity:{c.on ? 1 : 0.08}"
    ></span>
  {/each}
</div>
