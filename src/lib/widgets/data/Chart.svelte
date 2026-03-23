<script lang="ts">
  import type { Snippet } from 'svelte';
  import { BarChart, AreaChart, PieChart, LineChart } from 'layerchart';
  import { scaleBand } from 'd3-scale';
  import { cn } from '../../utils.js';

  interface DataPoint {
    label: string;
    value: number;
    [key: string]: unknown;
  }

  interface Props {
    data: DataPoint[];
    type?: 'bar' | 'line' | 'pie' | 'area' | 'donut';
    title?: string;
    height?: number;
    colors?: string[];
    class?: string;
    chartSlot?: Snippet<[{ data: DataPoint[]; type: string }]>;
  }

  let {
    data, type = 'bar', title, height = 200,
    colors = [], class: className = '', chartSlot
  }: Props = $props();

  function getColor(index: number): string {
    if (colors[index]) return colors[index];
    const defaults = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    return defaults[index % defaults.length];
  }

  const colorRange = $derived(data.map((_, i) => getColor(i)));
  const total = $derived(data.reduce((sum, d) => sum + d.value, 0));
</script>

<div class={cn('ripple-chart', className)} style="min-height: {height}px">
  {#if title}<h3 class="ripple-chart-title">{title}</h3>{/if}

  {#if chartSlot}
    {@render chartSlot({ data, type })}
  {:else if type === 'bar'}
    <div style="height: {height}px">
      <BarChart {data} xScale={scaleBand().padding(0.25)}
        x="label" y="value" c="label" cRange={colorRange} axis="x"
        props={{ bars: { stroke: 'none', strokeWidth: 0, rounded: 'all' } }} />
    </div>
  {:else if type === 'line'}
    <div style="height: {height}px">
      <LineChart {data} x="label" y="value" c="label" cRange={colorRange} axis="x" />
    </div>
  {:else if type === 'area'}
    <div style="height: {height}px">
      <AreaChart {data} x="label" y="value" c="label" cRange={colorRange} axis="x" />
    </div>
  {:else if type === 'pie' || type === 'donut'}
    <div style="height: {height}px; display: flex; align-items: center; gap: 2rem;">
      <div style="flex: 1; height: 100%;">
        <PieChart {data} key="label" value="value" label="label" c="label"
          cRange={colorRange} innerRadius={type === 'donut' ? 0.5 : 0} />
      </div>
      <div class="ripple-chart-legend">
        {#each data as item, i}
          {@const percent = total > 0 ? (item.value / total) * 100 : 0}
          <div class="ripple-chart-legend-item">
            <span class="ripple-chart-legend-swatch" style="background-color: {getColor(i)}"></span>
            <span class="ripple-chart-legend-label">{item.label}</span>
            <span class="ripple-chart-legend-value">{percent.toFixed(1)}%</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
