<!-- src/lib/widgets/data/Sankey.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';

  type Node = { name: string };
  type Link = { source: string; target: string; value: number };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    nodes?: Node[];
    links?: Link[];
    height?: number;
    title?: string;
    /** Vertical or horizontal layout. */
    orient?: 'horizontal' | 'vertical';
    /** Curve factor for links (0-1). */
    curveness?: number;
    tooltip?: boolean;
  }

  let {
    id,
    class: className,
    style,
    nodes: rawNodes = [],
    links: rawLinks = [],
    height = 320,
    title,
    orient = 'horizontal',
    curveness = 0.5,
    tooltip = true
  }: Props = $props();

  const nodes = $derived(safeArray<Node>(rawNodes, { widget: 'sankey', key: 'nodes' }));
  const links = $derived(safeArray<Link>(rawLinks, { widget: 'sankey', key: 'links' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let chartEl: HTMLDivElement;
  let chart: any = null;
  let echartsMod: any = null;

  function buildOption() {
    return {
      animation: true,
      animationDuration: 400,
      backgroundColor: 'transparent',
      title: title
        ? { text: title, left: 0, top: 0, textStyle: { fontSize: 13, fontWeight: 600 } }
        : undefined,
      tooltip: tooltip ? { trigger: 'item' } : false,
      series: [
        {
          type: 'sankey',
          left: 12,
          right: 96,
          top: title ? 36 : 12,
          bottom: 12,
          orient,
          data: nodes,
          links,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', curveness },
          label: { fontSize: 11 }
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
    if (chart && (nodes || links)) chart.setOption(buildOption(), true);
  });
</script>

<div
  {id}
  bind:this={chartEl}
  class={cn('w-full text-foreground', className)}
  style={`height: ${height}px; ${styleString ?? ''}`}
></div>
