<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '$lib/utils.js';

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
		tooltip?: boolean;
		class?: string;
		chartSlot?: Snippet<[{ data: DataPoint[]; type: string }]>;
	}

	let {
		data,
		type = 'bar',
		title,
		height = 200,
		colors = [],
		tooltip = true,
		class: className = '',
		chartSlot
	}: Props = $props();

	const defaultColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

	function getColor(i: number): string {
		return colors[i] || defaultColors[i % defaultColors.length];
	}

	let chartEl: HTMLDivElement;
	let chart: any = null;

	function buildOption() {
		const labels = data.map(d => d.label);
		const values = data.map(d => d.value);
		const itemColors = data.map((_, i) => getColor(i));

		const base: any = {
			animation: true,
			animationDuration: 400,
			backgroundColor: 'transparent',
			grid: { left: 4, right: 4, top: title ? 30 : 8, bottom: 24, containLabel: true },
			tooltip: tooltip ? {
				trigger: type === 'pie' || type === 'donut' ? 'item' : 'axis',
				backgroundColor: 'rgba(0,0,0,0.8)',
				borderColor: 'rgba(255,255,255,0.1)',
				textStyle: { color: '#fff', fontSize: 11 },
			} : false,
		};

		if (title) {
			base.title = {
				text: title,
				left: 0, top: 0,
				textStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 },
			};
		}

		if (type === 'bar') {
			return {
				...base,
				xAxis: {
					type: 'category', data: labels,
					axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
					axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
					axisTick: { show: false },
				},
				yAxis: {
					type: 'value',
					axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
					splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
				},
				series: [{
					type: 'bar', data: values,
					itemStyle: { borderRadius: [3, 3, 0, 0], color: (p: any) => itemColors[p.dataIndex] },
					barMaxWidth: 32,
				}],
			};
		}

		if (type === 'line' || type === 'area') {
			return {
				...base,
				xAxis: {
					type: 'category', data: labels, boundaryGap: false,
					axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
					axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
					axisTick: { show: false },
				},
				yAxis: {
					type: 'value',
					axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
					splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
				},
				series: [{
					type: 'line', data: values,
					smooth: true,
					lineStyle: { color: itemColors[0], width: 2 },
					itemStyle: { color: itemColors[0] },
					areaStyle: type === 'area' ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
						{ offset: 0, color: itemColors[0] + '40' },
						{ offset: 1, color: itemColors[0] + '05' },
					]}} : undefined,
					symbol: 'circle', symbolSize: 4,
				}],
			};
		}

		if (type === 'pie' || type === 'donut') {
			return {
				...base,
				grid: undefined,
				series: [{
					type: 'pie',
					radius: type === 'donut' ? ['40%', '70%'] : ['0%', '70%'],
					center: ['40%', '50%'],
					data: data.map((d, i) => ({ name: d.label, value: d.value, itemStyle: { color: getColor(i) } })),
					label: { show: false },
					emphasis: { label: { show: true, fontSize: 12, color: '#fff' } },
				}],
				legend: {
					orient: 'vertical', right: 0, top: 'center',
					textStyle: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
					icon: 'roundRect', itemWidth: 10, itemHeight: 10,
				},
			};
		}

		return base;
	}

	async function initChart() {
		if (!chartEl) return;
		const echarts = await import('echarts');
		chart = echarts.init(chartEl, undefined, { renderer: 'canvas' });
		chart.setOption(buildOption());
	}

	function resizeChart() {
		chart?.resize();
	}

	onMount(() => {
		initChart();
		window.addEventListener('resize', resizeChart);
	});

	onDestroy(() => {
		window.removeEventListener('resize', resizeChart);
		chart?.dispose();
	});

	// Update chart when data changes
	$effect(() => {
		if (chart && data) {
			chart.setOption(buildOption(), true);
		}
	});
</script>

<div class={cn('w-full', className)}>
	{#if chartSlot}
		{@render chartSlot({ data, type })}
	{:else}
		<div bind:this={chartEl} style="width:100%;height:{height}px"></div>
	{/if}
</div>
