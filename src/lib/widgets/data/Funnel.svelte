<!-- src/lib/widgets/data/Funnel.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  type Stage = { label: string; value: number };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    data?: Stage[];
    height?: number;
    title?: string;
    colors?: string[];
    /** Sort order — descending shows largest at top (default), ascending inverts. */
    sort?: 'descending' | 'ascending' | 'none';
    tooltip?: boolean;
  }

  let {
    id,
    class: className,
    style,
    data = [],
    height = 240,
    title,
    colors = [],
    sort = 'descending',
    tooltip = true
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6'];
  function getColor(i: number): string {
    return colors[i] ?? defaultColors[i % defaultColors.length];
  }

  let chartEl: HTMLDivElement;
  let chart: any = null;
  let echartsMod: any = null;

  function buildOption() {
    const series = data.map((d, i) => ({
      name: d.label,
      value: d.value,
      itemStyle: { color: getColor(i) }
    }));
    return {
      animation: true,
      animationDuration: 400,
      backgroundColor: 'transparent',
      title: title
        ? { text: title, left: 0, top: 0, textStyle: { fontSize: 13, fontWeight: 600 } }
        : undefined,
      tooltip: tooltip ? { trigger: 'item', formatter: '{b}: {c}' } : false,
      series: [
        {
          type: 'funnel',
          left: 12,
          right: 12,
          top: title ? 36 : 12,
          bottom: 12,
          minSize: '0%',
          maxSize: '100%',
          sort,
          gap: 2,
          label: { show: true, position: 'inside', color: '#fff', fontSize: 12 },
          data: series
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
    if (chart && data) chart.setOption(buildOption(), true);
  });
</script>

<div
  {id}
  bind:this={chartEl}
  class={cn('w-full text-foreground', className)}
  style={`height: ${height}px; ${styleString ?? ''}`}
></div>
