<!--
  Chart.svelte — 10 chart types: bar, line, area, pie, donut,
  candlestick, sparkline, heatmap, gauge, radar.
  ResizeObserver init, theme-aware colors, themeOverrides deep merge.
  Modified: 2026-06-09 — chartEl declared with $state() (was plain `let`) so
  bind:this updates are reactive (fixes non_reactive_update).
  Modified: 2026-06-27 — forward node id (bind id + data-ripple-node on the root div)
  for editor selection (SP-0 id-forwarding codemod).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { safeArray, safeObject } from '$lib/utils/safe-props.js';

	interface DataPoint {
		label: string;
		value?: number;
		series?: Record<string, number>;
		open?: number;
		close?: number;
		high?: number;
		low?: number;
		[key: string]: unknown;
	}

	interface Props {
		id?: string;
		data: DataPoint[];
		type?: 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'candlestick' | 'sparkline' | 'heatmap' | 'gauge' | 'radar';
		title?: string;
		height?: number;
		colors?: string[];
		tooltip?: boolean;
		themeOverrides?: Record<string, unknown>;
		bullColor?: string;
		bearColor?: string;
		class?: string;
		chartSlot?: Snippet<[{ data: DataPoint[]; type: string }]>;
	}

	let {
		id,
		data: rawData,
		type = 'bar',
		title,
		height = 200,
		colors: rawColors = [],
		tooltip = true,
		themeOverrides: rawThemeOverrides = {},
		bullColor = '#22c55e',
		bearColor = '#ef4444',
		class: className = '',
		chartSlot
	}: Props = $props();

	// Defensive: LLM-generated specs may pass non-array `data` (e.g. an
	// unresolved expression string) — coerce once here so every usage
	// below is safe. Same for `colors` and `themeOverrides`.
	const data = $derived(safeArray<DataPoint>(rawData, { widget: 'chart', key: 'data' }));
	const colors = $derived(safeArray<string>(rawColors, { widget: 'chart', key: 'colors' }));
	const themeOverrides = $derived(
		safeObject<Record<string, unknown>>(rawThemeOverrides, { widget: 'chart', key: 'themeOverrides' })
	);

	const defaultColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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

	let chartEl: HTMLDivElement | undefined = $state();
	let chart: any = null;
	let echartsMod: any = null;

	function themeColors() {
		if (!chartEl) return { fg: '#888', fgSoft: 'rgba(136,136,136,0.5)', fgMuted: 'rgba(136,136,136,0.35)', line: 'rgba(136,136,136,0.06)', split: 'rgba(136,136,136,0.04)' };
		const s = getComputedStyle(chartEl);
		const fg = s.getPropertyValue('color').trim() || '#888';
		return {
			fg,
			fgSoft: applyAlpha(fg, 0.5),
			fgMuted: applyAlpha(fg, 0.35),
			line: applyAlpha(fg, 0.06),
			split: applyAlpha(fg, 0.04),
		};
	}

	function applyAlpha(color: string, alpha: number): string {
		// comma-separated: rgb(255, 255, 255)
		const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
		// space-separated (modern browsers): rgb(255 255 255) or rgb(255 255 255 / 1)
		const m2 = color.match(/^rgba?\((\d+)\s+(\d+)\s+(\d+)/);
		if (m2) return `rgba(${m2[1]},${m2[2]},${m2[3]},${alpha})`;
		// hex
		if (color.startsWith('#') && color.length >= 7) {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			return `rgba(${r},${g},${b},${alpha})`;
		}
		// oklch/hsl/color() — resolve via canvas
		try {
			const cv = document.createElement('canvas');
			cv.width = cv.height = 1;
			const ctx = cv.getContext('2d')!;
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
			return `rgba(${r},${g},${b},${alpha})`;
		} catch {
			return color;
		}
	}

	function buildOption() {
		const tc = themeColors();
		const labels = data.map(d => d.label);
		const values = data.map(d => d.value ?? 0);
		const itemColors = data.map((_, i) => getColor(i));

		// Detect multi-series: any point carries a `series` map → one ECharts series per key.
		const seriesKeys: string[] = (() => {
			const seen = new Set<string>();
			for (const d of data) {
				if (d.series && typeof d.series === 'object') {
					for (const k of Object.keys(d.series)) seen.add(k);
				}
			}
			return [...seen];
		})();
		const isMulti = seriesKeys.length > 0;

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
				textStyle: { color: tc.fg, fontSize: 13, fontWeight: 600 },
			};
		}

		const xAxisBase = {
			type: 'category' as const,
			data: labels,
			axisLabel: { color: tc.fgSoft, fontSize: 10 },
			axisLine: { lineStyle: { color: tc.line } },
			axisTick: { show: false },
			splitLine: { show: false },
		};

		const yAxisBase = {
			type: 'value' as const,
			axisLabel: { color: tc.fgMuted, fontSize: 10 },
			splitLine: { lineStyle: { color: tc.split } },
		};

		let option: any;

		if (type === 'bar') {
			if (isMulti) {
				const series = seriesKeys.map((key, i) => ({
					name: key,
					type: 'bar',
					data: data.map(d => d.series?.[key] ?? 0),
					itemStyle: { borderRadius: [3, 3, 0, 0], color: getColor(i) },
					barMaxWidth: 32,
				}));
				option = {
					...base,
					grid: { ...base.grid, top: title ? 48 : 28 },
					legend: {
						data: seriesKeys, top: title ? 22 : 2, left: 0,
						textStyle: { color: tc.fgSoft, fontSize: 11 },
						icon: 'roundRect', itemWidth: 10, itemHeight: 10,
					},
					xAxis: xAxisBase,
					yAxis: yAxisBase,
					series,
				};
			} else {
				option = {
					...base,
					xAxis: xAxisBase,
					yAxis: yAxisBase,
					series: [{
						type: 'bar', data: values,
						itemStyle: {
							borderRadius: [3, 3, 0, 0],
							color: (p: any) => itemColors[p.dataIndex],
						},
						barMaxWidth: 32,
					}],
				};
			}
		} else if (type === 'line' || type === 'area') {
			if (isMulti) {
				const series = seriesKeys.map((key, i) => {
					const color = getColor(i);
					return {
						name: key,
						type: 'line',
						data: data.map(d => d.series?.[key] ?? 0),
						smooth: true,
						lineStyle: { color, width: 2 },
						itemStyle: { color },
						areaStyle: type === 'area' ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
							{ offset: 0, color: color + '40' },
							{ offset: 1, color: color + '05' },
						]}} : undefined,
						symbol: 'circle', symbolSize: 4,
					};
				});
				option = {
					...base,
					grid: { ...base.grid, top: title ? 48 : 28 },
					legend: {
						data: seriesKeys, top: title ? 22 : 2, left: 0,
						textStyle: { color: tc.fgSoft, fontSize: 11 },
						icon: 'roundRect', itemWidth: 10, itemHeight: 10,
					},
					xAxis: { ...xAxisBase, boundaryGap: false },
					yAxis: yAxisBase,
					series,
				};
			} else {
				option = {
					...base,
					xAxis: { ...xAxisBase, boundaryGap: false },
					yAxis: yAxisBase,
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
					emphasis: { label: { show: true, fontSize: 12, color: tc.fg } },
				}],
				legend: {
					orient: 'vertical', right: 0, top: 'center',
					textStyle: { color: tc.fgSoft, fontSize: 11 },
					icon: 'roundRect', itemWidth: 10, itemHeight: 10,
				},
			};
		} else if (type === 'candlestick') {
			const ohlc = data.map(d => [d.open ?? d.value, d.close ?? d.value, d.low ?? d.value, d.high ?? d.value]);
			option = {
				...base,
				xAxis: xAxisBase,
				yAxis: { ...yAxisBase, scale: true },
				series: [{
					type: 'candlestick',
					data: ohlc,
					itemStyle: {
						color: bullColor,
						color0: bearColor,
						borderColor: bullColor,
						borderColor0: bearColor,
					},
				}],
			};
		} else if (type === 'sparkline') {
			const trend = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
			const lineColor = trend >= 0 ? bullColor : bearColor;
			option = {
				animation: true,
				animationDuration: 400,
				backgroundColor: 'transparent',
				grid: { left: 0, right: 0, top: 2, bottom: 2 },
				xAxis: { type: 'category', data: labels, show: false },
				yAxis: { type: 'value', show: false, scale: true },
				tooltip: tooltip ? {
					trigger: 'axis',
					backgroundColor: 'rgba(0,0,0,0.8)',
					borderColor: 'rgba(255,255,255,0.1)',
					textStyle: { color: '#fff', fontSize: 11 },
				} : false,
				series: [{
					type: 'line',
					data: values,
					smooth: true,
					symbol: 'none',
					lineStyle: { color: lineColor, width: 1.5 },
					areaStyle: {
						color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
							{ offset: 0, color: lineColor + '30' },
							{ offset: 1, color: lineColor + '05' },
						]}
					},
				}],
			};
		} else if (type === 'heatmap') {
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
					axisLabel: { color: tc.fgSoft, fontSize: 10 },
					axisLine: { lineStyle: { color: tc.line } },
					axisTick: { show: false },
					splitArea: { show: false },
				},
				yAxis: {
					type: 'category', data: yCategories,
					axisLabel: { color: tc.fgMuted, fontSize: 10 },
					axisLine: { lineStyle: { color: tc.line } },
					axisTick: { show: false },
					splitArea: { show: false },
				},
				visualMap: {
					min: minHeat, max: maxHeat,
					calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
					inRange: { color: [itemColors[0] + '20', itemColors[0]] },
					textStyle: { color: tc.fgSoft, fontSize: 10 },
				},
				series: [{
					type: 'heatmap', data: heatData,
					label: { show: false },
					emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
				}],
			};
		} else if (type === 'gauge') {
			const gaugeValue = data.length > 0 ? data[0].value : 0;
			const gaugeLabel = data.length > 0 ? data[0].label : '';

			option = {
				...base,
				grid: undefined,
				series: [{
					type: 'gauge',
					startAngle: 200, endAngle: -20, min: 0, max: 100,
					progress: { show: true, width: 12, itemStyle: { color: itemColors[0] } },
					axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.04)']] } },
					axisTick: { show: false },
					splitLine: { show: false },
					axisLabel: { show: false },
					anchor: { show: false },
					pointer: { show: false },
					title: {
						show: !!gaugeLabel, offsetCenter: [0, '70%'],
						fontSize: 11, color: tc.fgSoft,
					},
					detail: {
						valueAnimation: true, fontSize: 24, fontWeight: 600,
						offsetCenter: [0, '0%'], color: tc.fg, formatter: '{value}%',
					},
					data: [{ value: gaugeValue, name: gaugeLabel }],
				}],
			};
		} else if (type === 'radar') {
			const maxValue = Math.max(...values, 100);
			const indicators = data.map(d => ({ name: d.label, max: maxValue }));

			option = {
				...base,
				grid: undefined,
				radar: {
					indicator: indicators, shape: 'polygon',
					axisName: { color: tc.fgSoft, fontSize: 10 },
					splitArea: { areaStyle: { color: [applyAlpha(tc.fg, 0.02), applyAlpha(tc.fg, 0.04)] } },
					splitLine: { lineStyle: { color: tc.line } },
					axisLine: { lineStyle: { color: tc.line } },
				},
				series: [{
					type: 'radar',
					data: [{
						value: values, name: title || '',
						areaStyle: { color: itemColors[0] + '30' },
						lineStyle: { color: itemColors[0], width: 2 },
						itemStyle: { color: itemColors[0] },
						symbol: 'circle', symbolSize: 4,
					}],
				}],
			};
		} else {
			option = base;
		}

		// Apply user theme overrides last
		if (themeOverrides && Object.keys(themeOverrides).length > 0) {
			option = deepMerge(option, themeOverrides);
		}

		return option;
	}

	async function initChart() {
		if (!chartEl) return;
		if (!echartsMod) echartsMod = await import('echarts');
		if (chart) {
			chart.dispose();
			chart = null;
		}
		chart = echartsMod.init(chartEl, undefined, { renderer: 'canvas' });
		chart.setOption(buildOption());
	}

	onMount(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height: h } = entry.contentRect;
				if (width > 0 && h > 0) {
					if (!chart) {
						initChart();
					} else {
						chart.resize();
					}
				}
			}
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

	// Re-render when data or type changes
	$effect(() => {
		if (chart && data && type) {
			chart.setOption(buildOption(), true);
		}
	});
</script>

<div {id} data-ripple-node={id} class={cn('w-full', className)} style="color: var(--foreground)">
	{#if chartSlot}
		{@render chartSlot({ data, type })}
	{:else}
		<div bind:this={chartEl} style="width:100%;height:{height}px"></div>
	{/if}
</div>
