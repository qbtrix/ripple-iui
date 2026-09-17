<!-- origin: slev12397/beautiful-ui@ff0f74d components/atoms/ProgressRing.tsx

     2026-09-16 — re-skinned against the source atom, and against the copy of this
     geometry already living in widgets/ai/TaskRows.svelte. The two now agree:
     track on `stroke-ripple-border`, a round cap, and the dasharray arc.

     What moved: track `stroke-muted` → `stroke-ripple-border`; arc
     `stroke-primary` → `stroke-ripple-accent`; the dashoffset transition from
     300ms `ease-out` to the source's 400ms on `ease-ripple-out`, with the
     reduced-motion guard Segmented already uses; centre label onto
     `text-ripple-surface-foreground`.

     What did NOT move: `thickness` stays at 6. The source ring is 2px on a 28px
     box because it is a fixed task badge; this widget defaults to 64px and its
     stroke is a documented prop default, so changing it would restyle every
     existing spec for no source mandate. A caller wanting the source's hairline
     passes `thickness={2}`.

     The source's `tone` enum (orange | green | red | accent) did not come across
     — `color` already accepts any CSS colour, and a tone enum would be a new
     prop. Default arc is accent, not the source's orange: a general-purpose
     meter should not read as a warning. -->

<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Current value 0..max. */
    value?: number;
    max?: number;
    size?: number;
    /** Stroke width in px. */
    thickness?: number;
    /** Foreground color. */
    color?: string;
    /** Background track color. */
    trackColor?: string;
    /** Inner content — defaults to "{percent}%". */
    label?: string;
    /** Hide the centered label. */
    hideLabel?: boolean;
  }

  let {
    id,
    class: className,
    style,
    value = 0,
    max = 100,
    size = 64,
    thickness = 6,
    color,
    trackColor,
    label,
    hideLabel = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const pct = $derived(Math.max(0, Math.min(1, value / (max || 1))));
  const radius = $derived((size - thickness) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const offset = $derived(circumference * (1 - pct));
  const center = $derived(size / 2);
  const displayLabel = $derived(label ?? `${Math.round(pct * 100)}%`);
</script>

<div
  {id}
  class={cn('relative inline-grid place-items-center', className)}
  style={`width:${size}px; height:${size}px; ${styleString ?? ''}`}
  role="meter"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={value}
>
  <svg width={size} height={size} class="transform -rotate-90">
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke-width={thickness}
      class={cn(!trackColor && 'stroke-ripple-border')}
      stroke={trackColor}
    />
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke-width={thickness}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      class={cn(
        'transition-[stroke-dashoffset] duration-[400ms] ease-ripple-out motion-reduce:transition-none',
        !color && 'stroke-ripple-accent'
      )}
      stroke={color}
    />
  </svg>
  {#if !hideLabel}
    <span
      class="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-ripple-surface-foreground"
    >
      {displayLabel}
    </span>
  {/if}
</div>
