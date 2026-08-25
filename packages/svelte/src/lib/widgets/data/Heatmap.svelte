<!-- src/lib/widgets/data/Heatmap.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';

  type Cell = { x: string | number; y: string | number; value: number };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    cells?: Cell[];
    /** Explicit x-axis labels (otherwise derived from cells). */
    xLabels?: (string | number)[];
    /** Explicit y-axis labels (otherwise derived from cells). */
    yLabels?: (string | number)[];
    height?: number;
    title?: string;
    /** Color range for low → high. */
    colorRange?: [string, string];
    showLabels?: boolean;
    tooltip?: boolean;
  }

  let {
    id,
    class: className,
    style,
    cells: rawCells = [],
    xLabels,
    yLabels,
    height = 280,
    title,
    colorRange = ['#dbeafe', '#1d4ed8'],
    showLabels = false,
    tooltip = true
  }: Props = $props();

  const cells = $derived(safeArray<Cell>(rawCells, { widget: 'heatmap', key: 'cells' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let chartEl: HTMLDivElement;
  let chart: any = null;
  let echartsMod: any = null;

  function buildOption() {
    const xs = xLabels ?? Array.from(new Set(cells.map((c) => c.x)));
    const ys = yLabels ?? Array.from(new Set(cells.map((c) => c.y)));
    const xIdx = new Map(xs.map((v, i) => [String(v), i]));
    const yIdx = new Map(ys.map((v, i) => [String(v), i]));
    const points = cells.map((c) => [
      xIdx.get(String(c.x)) ?? 0,
      yIdx.get(String(c.y)) ?? 0,
      c.value
    ]);
    const values = cells.map((c) => c.value);
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;

    return {
      animation: true,
      backgroundColor: 'transparent',
      title: title
        ? { text: title, left: 0, top: 0, textStyle: { fontSize: 13, fontWeight: 600 } }
        : undefined,
      tooltip: tooltip ? { position: 'top' } : false,
      grid: { left: 60, right: 16, top: title ? 40 : 16, bottom: 50, containLabel: true },
      xAxis: { type: 'category', data: xs, splitArea: { show: true } },
      yAxis: { type: 'category', data: ys, splitArea: { show: true } },
      visualMap: {
        min: minV,
        max: maxV,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: colorRange }
      },
      series: [
        {
          type: 'heatmap',
          data: points,
          label: { show: showLabels, fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } }
        }
      ]
    };
  }

  async function initChart() {
    if (!chartEl) return;
    if (!echartsMod) echartsMod = await import('echarts');
    chart?.dispose();
    chart = echartsMod.init(chartEl, undefined, { renderer: 'canvas' });
    chart.setOption(buildOption());
  }

  onMount(() => {
    const observer = new ResizeObserver(() => {
      if (!chart) initChart();
      else chart.resize();
    });
    if (chartEl) observer.observe(chartEl);
    const onResize = () => chart?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      chart?.dispose();
    };
  });

  $effect(() => {
    if (chart && cells) chart.setOption(buildOption(), true);
  });
</script>

<div
  {id}
  bind:this={chartEl}
  class={cn('w-full text-foreground', className)}
  style={`height: ${height}px; ${styleString ?? ''}`}
></div>
