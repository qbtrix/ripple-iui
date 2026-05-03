<!-- src/lib/widgets/data/Sparkline.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Chart from './Chart.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Numeric values, oldest → newest. */
    values?: number[];
    /** Optional matching labels for tooltip x-axis. */
    labels?: (string | number)[];
    /** Override the trend-driven color. */
    color?: string;
    bullColor?: string;
    bearColor?: string;
    height?: number;
    /** Hide tooltip on hover. */
    noTooltip?: boolean;
  }

  let {
    id,
    class: className,
    style,
    values = [],
    labels,
    color,
    bullColor,
    bearColor,
    height = 36,
    noTooltip = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Chart's `data` shape: [{ label, value }]
  const data = $derived(
    values.map((v, i) => ({ label: String(labels?.[i] ?? i + 1), value: v }))
  );
</script>

<div {id} class={cn('inline-block w-full', className)} style={styleString}>
  <Chart
    type="sparkline"
    {data}
    {height}
    tooltip={!noTooltip}
    bullColor={bullColor ?? color ?? '#22c55e'}
    bearColor={bearColor ?? color ?? '#ef4444'}
    colors={color ? [color] : []}
  />
</div>
