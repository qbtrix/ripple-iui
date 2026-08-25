<!-- src/lib/widgets/data/Treemap.svelte -->
<script module lang="ts">
  // Public type — declared at module scope so svelte-package can emit
  // it in the generated .d.ts. `export type` inside the per-instance
  // <script> block isn't reachable from the module's d.ts surface.
  export type Node = {
    name: string;
    value?: number;
    children?: Node[];
    color?: string;
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    data?: Node[];
    height?: number;
    title?: string;
    /** Show breadcrumb navigation. */
    showBreadcrumb?: boolean;
    /** Show child labels. */
    showLabels?: boolean;
    tooltip?: boolean;
    colors?: string[];
  }

  let {
    id,
    class: className,
    style,
    data: rawData = [],
    height = 320,
    title,
    showBreadcrumb = true,
    showLabels = true,
    tooltip = true,
    colors
  }: Props = $props();

  const data = $derived(safeArray<Node>(rawData, { widget: 'treemap', key: 'data' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let chartEl: HTMLDivElement;
  let chart: any = null;
  let echartsMod: any = null;

  function applyColors(items: Node[]): Node[] {
    return items.map((n) => ({
      ...n,
      itemStyle: n.color ? { color: n.color } : undefined,
      children: n.children ? applyColors(n.children) : undefined
    })) as Node[];
  }

  function buildOption() {
    return {
      animation: true,
      animationDuration: 400,
      backgroundColor: 'transparent',
      title: title
        ? { text: title, left: 0, top: 0, textStyle: { fontSize: 13, fontWeight: 600 } }
        : undefined,
      tooltip: tooltip ? { formatter: '{b}: {c}' } : false,
      ...(colors ? { color: colors } : {}),
      series: [
        {
          type: 'treemap',
          left: 12,
          right: 12,
          top: title ? 36 : 12,
          bottom: showBreadcrumb ? 28 : 12,
          roam: false,
          nodeClick: 'zoomToNode',
          breadcrumb: { show: showBreadcrumb },
          label: { show: showLabels, fontSize: 11 },
          upperLabel: { show: true, fontSize: 11, height: 22 },
          itemStyle: { borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, gapWidth: 1 },
          data: applyColors(data)
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
