<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { BarChart, AreaChart, PieChart, LineChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';

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
		/** Escape hatch: render your own chart */
		chartSlot?: Snippet<[{ data: DataPoint[]; type: string }]>;
	}

	let {
		data,
		type = 'bar',
		title,
		height = 200,
		colors = [],
		class: className = '',
		chartSlot
	}: Props = $props();

	function getColor(index: number): string {
		if (colors[index]) return colors[index];
		return `var(--chart-${(index % 5) + 1})`;
	}

	const chartConfig = $derived.by(() => {
		const config: Chart.ChartConfig = {};
		data.forEach((item, idx) => {
			config[item.label] = {
				label: item.label,
				color: getColor(idx)
			};
		});
		return config;
	});

	const colorRange = $derived(data.map((_, i) => getColor(i)));
	const total = $derived(data.reduce((sum, d) => sum + d.value, 0));
</script>

<div class={cn('w-full', className)}>
	{#if title}
		<h3 class="text-sm font-semibold mb-3 text-foreground">{title}</h3>
	{/if}

	{#if chartSlot}
		{@render chartSlot({ data, type })}
	{:else if type === 'bar'}
		<Chart.Container config={chartConfig} class="min-h-[{height}px] w-full">
			<BarChart
				{data}
				xScale={scaleBand().padding(0.25)}
				x="label" y="value" c="label"
				cRange={colorRange}
				axis="x"
				props={{
					bars: { stroke: 'none', strokeWidth: 0, rounded: 'all' },
					xAxis: { format: (d) => d.length > 10 ? d.slice(0, 10) + '…' : d }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</BarChart>
		</Chart.Container>

	{:else if type === 'line'}
		<Chart.Container config={chartConfig} class="min-h-[{height}px] w-full">
			<LineChart
				{data} x="label" y="value" c="label"
				cRange={colorRange} axis="x"
				props={{
					xAxis: { format: (d) => d.length > 10 ? d.slice(0, 10) + '…' : d }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</LineChart>
		</Chart.Container>

	{:else if type === 'area'}
		<Chart.Container config={chartConfig} class="min-h-[{height}px] w-full">
			<AreaChart
				{data} x="label" y="value" c="label"
				cRange={colorRange} axis="x"
				props={{
					xAxis: { format: (d) => d.length > 10 ? d.slice(0, 10) + '…' : d }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</AreaChart>
		</Chart.Container>

	{:else if type === 'pie' || type === 'donut'}
		<div class="flex items-center gap-6">
			<Chart.Container config={chartConfig} class="flex-1 min-h-[{height}px]">
				<PieChart
					{data} key="label" value="value" label="label" c="label"
					cRange={colorRange}
					innerRadius={type === 'donut' ? 0.5 : 0}
				>
					{#snippet tooltip()}
						<Chart.Tooltip />
					{/snippet}
				</PieChart>
			</Chart.Container>

			<div class="space-y-1.5 min-w-28">
				{#each data as item, i}
					{@const percent = total > 0 ? (item.value / total) * 100 : 0}
					<div class="flex items-center gap-2">
						<div
							class="size-2.5 rounded-sm shrink-0"
							style="background-color: {getColor(i)}"
						></div>
						<span class="text-xs text-foreground truncate flex-1">{item.label}</span>
						<span class="text-xs text-muted-foreground font-mono">{percent.toFixed(0)}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
