<!--
  Chart.svelte — Changes:
  - Added iosTheme boolean prop (default false) and themeOverrides prop
  - Added IOS_THEME constant ported from paw-os-ui EChart.svelte
  - Deep-merge IOS_THEME into chart options when iosTheme is enabled
  - iOS theme applies: 600ms animation with cubicOut easing, rounded bars, smooth curves
  - Added 3 new chart types: heatmap, gauge, radar
  - Replaced window resize listener with ResizeObserver for better performance
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '../../utils.js';

	interface DataPoint {
		label: string;
		value: number;
		[key: string]: unknown;
	}

	interface Props {
		data: DataPoint[];
		type?: 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'heatmap' | 'gauge' | 'radar';
		title?: string;
		height?: number;
		colors?: string[];
		tooltip?: boolean;
		iosTheme?: boolean;
		themeOverrides?: Record<string, unknown>;
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
		iosTheme = false,
		themeOverrides = {},
		class: className = '',
		chartSlot
	}: Props = $props();

	const defaultColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

	const IOS_THEME = {
		backgroundColor: 'transparent',
		textStyle: {
			color: 'rgba(255,255,255,0.50)',
			fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
			fontSize: 10,
		},
		grid: {
			left: 4, right: 4, top: 8, bottom: 4,
			containLabel: false,
		},
		xAxis: {
			show: false,
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: { show: false },
		},
		yAxis: {
			show: false,
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: { show: false },
		},
		tooltip: {
			backgroundColor: 'rgba(30,30,28,0.92)',
			borderColor: 'rgba(255,255,255,0.10)',
			textStyle: { color: '#fff', fontSize: 11 },
			padding: [6, 10],
		},
	};

	/**
	 * Simple deep merge utility. Merges source into target recursively.
	 * Arrays are replaced, not concatenated. Primitives from source win.
	 */
	function deepMerge<T extends Record<string, any>>(target: T, ...sources: Record<string, any>[]): T {
		const result = { ...target };
		for (const source of sources) {
			if (!source) continue;
			for (const key of Object.keys(source)) {
				const targetVal = (result as any)[key];
				const sourceVal = source[key];
				if (
					sourceVal !== null &&
					typeof sourceVal === 'object' &&
					!Array.isArray(sourceVal) &&
					targetVal !== null &&
					typeof targetVal === 'object' &&
					!Array.isArray(targetVal)
				) {
					(result as any)[key] = deepMerge(targetVal, sourceVal);
				} else {
					(result as any)[key] = sourceVal;
				}
			}
		}
		return result;
	}

	function getColor(i: number): string {
		return colors[i] || defaultColors[i % defaultColors.length];
	}

	let chartEl: HTMLDivElement;
	let chart: any = null;
	let resizeObserver: ResizeObserver | null = null;

	function buildOption() {
		const labels = data.map(d => d.label);
		const values = data.map(d => d.value);
		const itemColors = data.map((_, i) => getColor(i));

		const base: any = {
			animation: true,
			animationDuration: iosTheme ? 600 : 400,
			animationEasing: iosTheme ? 'cubicOut' : 'cubicInOut',
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

		let option: any;

		if (type === 'bar') {
			option = {
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
					itemStyle: {
						borderRadius: iosTheme ? [4, 4, 0, 0] : [3, 3, 0, 0],
						color: (p: any) => itemColors[p.dataIndex],
					},
					barMaxWidth: 32,
				}],
			};
		} else if (type === 'line' || type === 'area') {
			option = {
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
					smooth: iosTheme ? 0.4 : true,
					lineStyle: { color: itemColors[0], width: 2 },
					itemStyle: { color: itemColors[0] },
					areaStyle: type === 'area' ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
						{ offset: 0, color: itemColors[0] + '40' },
						{ offset: 1, color: itemColors[0] + '05' },
					]}} : undefined,
					symbol: 'circle', symbolSize: 4,
				}],
			};
		} else if (type === 'pie' || type === 'donut') {
			option = {
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
		} else if (type === 'heatmap') {
			// Each DataPoint: label (x category), value (y category index or numeric), heat (z value)
			const xCategories = [...new Set(data.map(d => d.label))];
			const yCategories = [...new Set(data.map(d => String(d.value)))];
			const heatData = data.map(d => [
				xCategories.indexOf(d.label),
				yCategories.indexOf(String(d.value)),
				typeof d.heat === 'number' ? d.heat : d.value,
			]);
			const heatValues = heatData.map(d => d[2] as number);
			const minHeat = Math.min(...heatValues);
			const maxHeat = Math.max(...heatValues);

			option = {
				...base,
				xAxis: {
					type: 'category', data: xCategories,
					axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
					axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
					axisTick: { show: false },
					splitArea: { show: false },
				},
				yAxis: {
					type: 'category', data: yCategories,
					axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
					axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
					axisTick: { show: false },
					splitArea: { show: false },
				},
				visualMap: {
					min: minHeat,
					max: maxHeat,
					calculable: true,
					orient: 'horizontal',
					left: 'center',
					bottom: 0,
					inRange: { color: [itemColors[0] + '20', itemColors[0]] },
					textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
				},
				series: [{
					type: 'heatmap',
					data: heatData,
					label: { show: false },
					emphasis: {
						itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
					},
				}],
			};
		} else if (type === 'gauge') {
			// Uses first data point's value as the gauge value (0-100)
			const gaugeValue = data.length > 0 ? data[0].value : 0;
			const gaugeLabel = data.length > 0 ? data[0].label : '';

			option = {
				...base,
				grid: undefined,
				series: [{
					type: 'gauge',
					startAngle: 200,
					endAngle: -20,
					min: 0,
					max: 100,
					progress: {
						show: true,
						width: 12,
						itemStyle: { color: itemColors[0] },
					},
					axisLine: {
						lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.08)']] },
					},
					axisTick: { show: false },
					splitLine: { show: false },
					axisLabel: { show: false },
					anchor: { show: false },
					pointer: { show: false },
					title: {
						show: !!gaugeLabel,
						offsetCenter: [0, '70%'],
						fontSize: 11,
						color: 'rgba(255,255,255,0.6)',
					},
					detail: {
						valueAnimation: true,
						fontSize: 24,
						fontWeight: 600,
						offsetCenter: [0, '0%'],
						color: 'rgba(255,255,255,0.85)',
						formatter: '{value}%',
					},
					data: [{ value: gaugeValue, name: gaugeLabel }],
				}],
			};
		} else if (type === 'radar') {
			// Each DataPoint: label = indicator name, value = indicator value
			const maxValue = Math.max(...values, 100);
			const indicators = data.map(d => ({ name: d.label, max: maxValue }));

			option = {
				...base,
				grid: undefined,
				radar: {
					indicator: indicators,
					shape: 'polygon',
					axisName: {
						color: 'rgba(255,255,255,0.5)',
						fontSize: 10,
					},
					splitArea: {
						areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] },
					},
					splitLine: {
						lineStyle: { color: 'rgba(255,255,255,0.08)' },
					},
					axisLine: {
						lineStyle: { color: 'rgba(255,255,255,0.08)' },
					},
				},
				series: [{
					type: 'radar',
					data: [{
						value: values,
						name: title || '',
						areaStyle: { color: itemColors[0] + '30' },
						lineStyle: { color: itemColors[0], width: 2 },
						itemStyle: { color: itemColors[0] },
						symbol: 'circle',
						symbolSize: 4,
					}],
				}],
			};
		} else {
			option = base;
		}

		// Apply iOS theme deep merge when enabled
		if (iosTheme) {
			option = deepMerge(option, IOS_THEME);
		}

		// Apply user theme overrides last
		if (themeOverrides && Object.keys(themeOverrides).length > 0) {
			option = deepMerge(option, themeOverrides);
		}

		return option;
	}

	async function initChart() {
		if (!chartEl) return;
		const echarts = await import('echarts');
		chart = echarts.init(chartEl, undefined, { renderer: 'canvas' });
		chart.setOption(buildOption());
	}

	onMount(() => {
		initChart();
		resizeObserver = new ResizeObserver(() => { chart?.resize(); });
		if (chartEl) resizeObserver.observe(chartEl);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
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
