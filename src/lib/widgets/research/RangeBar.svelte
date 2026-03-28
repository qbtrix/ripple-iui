<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    /** Label for the range */
    label?: string;
    /** Minimum value (left) */
    min: number;
    /** Maximum value (right) */
    max: number;
    /** Current value (marker position) */
    current: number;
    /** Formatted min label */
    minLabel?: string;
    /** Formatted max label */
    maxLabel?: string;
    /** Formatted current value label */
    currentLabel?: string;
    /** Bar color */
    color?: string;
    class?: string;
  }

  let {
    label, min, max, current,
    minLabel, maxLabel, currentLabel,
    color = 'hsl(var(--primary))',
    class: className
  }: Props = $props();

  const pct = $derived(
    max > min ? Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100)) : 50
  );
</script>

<div class={cn('rrb', className)}>
  {#if label}
    <div class="rrb-header">
      <span class="rrb-label">{label}</span>
      {#if currentLabel}
        <span class="rrb-current" style="color:{color}">{currentLabel}</span>
      {/if}
    </div>
  {/if}

  <div class="rrb-track">
    <div class="rrb-fill" style="width:{pct}%; background:{color}"></div>
    <div class="rrb-marker" style="left:{pct}%; border-color:{color}">
      <div class="rrb-marker-dot" style="background:{color}"></div>
    </div>
  </div>

  <div class="rrb-bounds">
    <span class="rrb-bound">{minLabel ?? min}</span>
    <span class="rrb-bound">{maxLabel ?? max}</span>
  </div>
</div>

<style>
  .rrb {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .rrb-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .rrb-label {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
    font-weight: 500;
  }
  .rrb-current {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
  }
  .rrb-track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: hsl(var(--muted) / 0.5);
  }
  .rrb-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 3px;
    opacity: 0.25;
  }
  .rrb-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid;
    background: hsl(var(--card));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rrb-marker-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .rrb-bounds {
    display: flex;
    justify-content: space-between;
  }
  .rrb-bound {
    font-size: 10px;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
  }
</style>
