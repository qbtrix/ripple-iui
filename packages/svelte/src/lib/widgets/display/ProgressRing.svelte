<!-- src/lib/widgets/display/ProgressRing.svelte -->
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
      class={cn(!trackColor && 'stroke-muted')}
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
      class={cn('transition-[stroke-dashoffset] duration-300 ease-out', !color && 'stroke-primary')}
      stroke={color}
    />
  </svg>
  {#if !hideLabel}
    <span
      class="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-foreground"
    >
      {displayLabel}
    </span>
  {/if}
</div>
