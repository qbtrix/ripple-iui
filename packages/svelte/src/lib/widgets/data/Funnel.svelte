<!-- Funnel.svelte — echarts funnel of ordered stages. Stage i takes the spec's colors[i],
     else slot i of chart-palette.ts (light or dark set from the resolved text colour). -->
<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import { chartPalette } from './chart-palette.js';

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
    data: rawData = [],
    height = 240,
    title,
    colors: rawColors = [],
    sort = 'descending',
    tooltip = true
  }: Props = $props();

  const data = $derived(safeArray<Stage>(rawData, { widget: 'funnel', key: 'data' }));
  const colors = $derived(safeArray<string>(rawColors, { widget: 'funnel', key: 'colors' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let chartEl: HTMLDivElement;
  // Reactive so the redraw $effect subscribes once the instance exists.
  let chart: any = $state.raw(null);
  let echartsMod: any = null;

  function buildOption() {
    const palette = chartPalette(chartEl ? getComputedStyle(chartEl).color : '');
    const series = data.map((d, i) => ({
      name: d.label,
      value: d.value,
      itemStyle: { color: colors[i] || palette[i % palette.length] }
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
  style={safeStyle(`height: ${height}px; ${styleString ?? ''}`)}
></div>
