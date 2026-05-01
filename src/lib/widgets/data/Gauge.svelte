<!-- src/lib/widgets/data/Gauge.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Chart from './Chart.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Current value 0..max. */
    value?: number;
    max?: number;
    label?: string;
    color?: string;
    height?: number;
    title?: string;
  }

  let {
    id,
    class: className,
    style,
    value = 0,
    max = 100,
    label,
    color,
    height = 200,
    title
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Chart's gauge expects 0..100, so we normalize against max.
  const normalized = $derived(Math.round((value / (max || 1)) * 100));
  const data = $derived([{ label: label ?? '', value: normalized }]);
</script>

<div {id} class={cn('w-full', className)} style={styleString}>
  <Chart type="gauge" {data} {height} {title} colors={color ? [color] : []} tooltip={false} />
</div>
