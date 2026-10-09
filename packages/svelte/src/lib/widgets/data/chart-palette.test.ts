// chart-palette.test.ts — the echarts-backed widgets draw with the Ripple
// palette by default, and a spec's explicit colours still win per index.
// echarts is mocked (jsdom has no canvas); assertions read the option handed to
// setOption. jsdom resolves no theme colour, so the widgets take the light set
// here; the dark selection is covered through chartPalette() directly.

import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Chart from './Chart.svelte';
import Funnel from './Funnel.svelte';
import Treemap from './Treemap.svelte';
import Sankey from './Sankey.svelte';
import { CHART_PALETTE_DARK, CHART_PALETTE_LIGHT, chartPalette, mergePalette } from './chart-palette.js';

const ec = vi.hoisted(() => ({ setOption: vi.fn() }));
vi.mock('echarts', () => ({
	init: () => ({ setOption: ec.setOption, resize: vi.fn(), dispose: vi.fn() })
}));

class SizedResizeObserver implements ResizeObserver {
	constructor(private cb: ResizeObserverCallback) {}
	observe() {
		this.cb([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this);
	}
	disconnect() {}
	unobserve() {}
}

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', SizedResizeObserver);
	ec.setOption.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

async function drawn() {
	await vi.waitFor(() => expect(ec.setOption).toHaveBeenCalled());
	return ec.setOption.mock.lastCall![0];
}

const multi = [
	{ label: 'Q1', series: { a: 1, b: 2, c: 3 } },
	{ label: 'Q2', series: { a: 2, b: 3, c: 4 } }
];

describe('chart', () => {
	test('multi-series bars take the palette in slot order', async () => {
		render(Chart, { props: { type: 'bar', data: multi } });
		const opt = await drawn();
		expect(opt.series.map((s: any) => s.itemStyle.color)).toEqual(CHART_PALETTE_LIGHT.slice(0, 3));
	});

	test('an explicit spec colour wins at its index; the rest stay on the palette', async () => {
		render(Chart, { props: { type: 'line', data: multi, colors: ['oklch(0.6 0.1 30)'] } });
		const opt = await drawn();
		expect(opt.series.map((s: any) => s.lineStyle.color)).toEqual([
			'oklch(0.6 0.1 30)',
			CHART_PALETTE_LIGHT[1],
			CHART_PALETTE_LIGHT[2]
		]);
	});

	const bars = [{ label: 'a', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }];
	async function barFills(colors?: string[]) {
		render(Chart, { props: { type: 'bar', data: bars, colors } });
		const fill = (await drawn()).series[0].itemStyle.color;
		return [0, 1, 2].map((dataIndex) => fill({ dataIndex }));
	}

	test('a single-series bar chart is one colour', async () => {
		expect(await barFills()).toEqual([CHART_PALETTE_LIGHT[0], CHART_PALETTE_LIGHT[0], CHART_PALETTE_LIGHT[0]]);
	});

	test('one spec colour on a single-series bar chart is the series colour', async () => {
		expect(await barFills(['#123456'])).toEqual(['#123456', '#123456', '#123456']);
	});

	test('a spec colour list colours its bars; gaps stay on slot 1', async () => {
		expect(await barFills(['', '#123456'])).toEqual([CHART_PALETTE_LIGHT[0], '#123456', CHART_PALETTE_LIGHT[0]]);
	});

	test('pie slices take the palette', async () => {
		const data = [{ label: 'a', value: 1 }, { label: 'b', value: 2 }];
		render(Chart, { props: { type: 'pie', data } });
		const opt = await drawn();
		expect(opt.series[0].data.map((d: any) => d.itemStyle.color)).toEqual(CHART_PALETTE_LIGHT.slice(0, 2));
	});

	test('no ECharts rainbow default is left', async () => {
		render(Chart, { props: { type: 'bar', data: multi } });
		const opt = await drawn();
		expect(JSON.stringify(opt)).not.toMatch(/#ef4444|#22c55e|#3b82f6/);
	});
});

describe('funnel, treemap, sankey', () => {
	test('funnel stages take the palette; spec colours win', async () => {
		const data = [{ label: 'a', value: 3 }, { label: 'b', value: 2 }, { label: 'c', value: 1 }];
		render(Funnel, { props: { data, colors: ['#123456'] } });
		const opt = await drawn();
		expect(opt.series[0].data.map((d: any) => d.itemStyle.color)).toEqual([
			'#123456',
			CHART_PALETTE_LIGHT[1],
			CHART_PALETTE_LIGHT[2]
		]);
	});

	test('treemap merges spec colours over the palette', async () => {
		render(Treemap, { props: { data: [{ name: 'a', value: 1 }], colors: ['#123456'] } });
		const opt = await drawn();
		expect(opt.color).toEqual(['#123456', ...CHART_PALETTE_LIGHT.slice(1)]);
	});

	test('sankey nodes use the palette', async () => {
		render(Sankey, {
			props: { nodes: [{ name: 'a' }, { name: 'b' }], links: [{ source: 'a', target: 'b', value: 1 }] }
		});
		const opt = await drawn();
		expect(opt.color).toEqual([...CHART_PALETTE_LIGHT]);
	});
});

describe('chartPalette', () => {
	test('light text means a dark surface', () => {
		expect(chartPalette('rgb(236, 239, 242)')).toBe(CHART_PALETTE_DARK);
		expect(chartPalette('#eceff2')).toBe(CHART_PALETTE_DARK);
	});
	test('dark or unreadable text means the light set', () => {
		expect(chartPalette('rgb(14 18 24)')).toBe(CHART_PALETTE_LIGHT);
		expect(chartPalette('')).toBe(CHART_PALETTE_LIGHT);
	});
	test('both sets lead with Paw blue and keep the same slot count', () => {
		expect(CHART_PALETTE_LIGHT[0]).toBe('#0055ff');
		expect(CHART_PALETTE_DARK[0]).toBe('#0055ff');
		expect(CHART_PALETTE_DARK).toHaveLength(CHART_PALETTE_LIGHT.length);
	});
	test('mergePalette keeps extra spec colours past the palette length', () => {
		const many = Array.from({ length: 8 }, (_, i) => `#00000${i}`);
		expect(mergePalette(many, CHART_PALETTE_LIGHT)).toEqual(many);
		expect(mergePalette(undefined, CHART_PALETTE_LIGHT)).toEqual([...CHART_PALETTE_LIGHT]);
	});
});
