// Chart.redraw.test.ts — the echarts-backed data widgets (chart, heatmap,
// treemap, sankey, funnel) and the frappe-gantt one redraw when their props
// change after mount: state behind `data` changes, a streamed spec delivers
// title/data in later chunks, or type/title are swapped on the live component.
// The chart libs are mocked (jsdom has no canvas), so every assertion reads the
// option handed to the instance's update call. The instance itself must be
// created once and updated in place, then disposed on unmount.

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';
import Chart from './Chart.svelte';
import Heatmap from './Heatmap.svelte';
import Treemap from './Treemap.svelte';
import Sankey from './Sankey.svelte';
import Funnel from './Funnel.svelte';
import GanttChart from './GanttChart.svelte';

const ec = vi.hoisted(() => ({ init: vi.fn(), setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }));
vi.mock('echarts', () => ({
	init: (...args: unknown[]) => {
		ec.init(...args);
		return { setOption: ec.setOption, resize: ec.resize, dispose: ec.dispose };
	}
}));

const gantt = vi.hoisted(() => ({ ctor: vi.fn(), refresh: vi.fn(), change_view_mode: vi.fn() }));
vi.mock('frappe-gantt', () => ({
	default: class {
		constructor(...args: unknown[]) {
			gantt.ctor(...args);
		}
		refresh = gantt.refresh;
		change_view_mode = gantt.change_view_mode;
	}
}));

/** ResizeObserver that reports a laid-out box as soon as it observes, so the
 *  widgets' "init once the element has a size" path runs in jsdom. */
class SizedResizeObserver {
	constructor(private cb: ResizeObserverCallback) {}
	observe() {
		this.cb([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this as never);
	}
	disconnect() {}
	unobserve() {}
}

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', SizedResizeObserver);
	for (const m of [...Object.values(ec), ...Object.values(gantt)]) m.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const lastOption = () => ec.setOption.mock.lastCall![0];

async function* chunked(json: string, size = 6) {
	for (let i = 0; i < json.length; i += size) {
		yield json.slice(i, i + size);
		await new Promise((r) => setTimeout(r, 0));
	}
}

describe('chart', () => {
	test('redraws when the state behind its data changes', async () => {
		const spec = {
			state: { v: 1 },
			ui: {
				type: 'flex',
				children: [
					{ type: 'chart', props: { type: 'bar', data: [{ label: 'a', value: '{state.v}' }] } },
					{ type: 'button', props: { label: 'Bump' }, on_click: { action: 'set', target: 'v', value: 5 } }
				]
			}
		};
		const { container } = render(Ripple, { props: { spec } });
		await vi.waitFor(() => expect(ec.setOption).toHaveBeenCalled());
		expect(lastOption().series[0].data).toEqual([1]);

		const bump = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Bump')!;
		await fireEvent.click(bump);
		await tick();
		await vi.waitFor(() => expect(lastOption().series[0].data).toEqual([5]));
		expect(ec.init).toHaveBeenCalledTimes(1);
	});

	test('streamed: title and data that arrive after mount are all drawn once the stream is done', async () => {
		const spec = {
			ui: {
				type: 'chart',
				props: {
					type: 'bar',
					title: 'Revenue by quarter',
					data: [
						{ label: 'Q1', value: 10 },
						{ label: 'Q2', value: 20 },
						{ label: 'Q3', value: 30 }
					],
					colors: ['#111111']
				}
			}
		};
		const store = streamSpec(chunked(JSON.stringify(spec)), { throttleMs: 0 });
		render(Ripple, { props: { streaming: store } });
		await vi.waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
		await tick();
		expect(store.error).toBeNull();

		await vi.waitFor(() => expect(lastOption().title?.text).toBe('Revenue by quarter'));
		expect(lastOption().xAxis.data).toEqual(['Q1', 'Q2', 'Q3']);
		expect(lastOption().series[0].data).toEqual([10, 20, 30]);
		// The chart mounted mid-stream: it was drawn before its props were whole.
		expect(ec.setOption.mock.calls[0][0].title?.text).not.toBe('Revenue by quarter');
		expect(ec.init).toHaveBeenCalledTimes(1);
	});

	test('type and title changed after mount update the live chart in place', async () => {
		const data = [
			{ label: 'a', value: 1 },
			{ label: 'b', value: 2 }
		];
		const { rerender, unmount } = render(Chart, { props: { type: 'bar', title: 'Old', data } });
		await vi.waitFor(() => expect(ec.setOption).toHaveBeenCalled());
		expect(lastOption().series[0].type).toBe('bar');

		await rerender({ type: 'line', title: 'New', data });
		await vi.waitFor(() => expect(lastOption().series[0].type).toBe('line'));
		expect(lastOption().title.text).toBe('New');
		// Full replace, so a bar→line switch drops the old series config.
		expect(ec.setOption.mock.lastCall![1]).toBe(true);
		expect(ec.init).toHaveBeenCalledTimes(1);

		unmount();
		expect(ec.dispose).toHaveBeenCalledTimes(1);
	});
});

describe.each([
	['heatmap', Heatmap, { cells: [{ x: 'a', y: 'r', value: 1 }] }, { cells: [{ x: 'a', y: 'r', value: 9 }] }, (o: any) => o.series[0].data, [[0, 0, 9]]],
	['treemap', Treemap, { data: [{ name: 'a', value: 1 }] }, { data: [{ name: 'b', value: 9 }] }, (o: any) => o.series[0].data.map((d: any) => d.name), ['b']],
	[
		'sankey',
		Sankey,
		{ nodes: [{ name: 'a' }, { name: 'b' }], links: [{ source: 'a', target: 'b', value: 1 }] },
		{ nodes: [{ name: 'a' }, { name: 'b' }], links: [{ source: 'a', target: 'b', value: 9 }] },
		(o: any) => o.series[0].links.map((l: any) => l.value),
		[9]
	],
	['funnel', Funnel, { data: [{ label: 'a', value: 1 }] }, { data: [{ label: 'a', value: 9 }] }, (o: any) => o.series[0].data.map((d: any) => d.value), [9]]
] as const)('%s', (_name, Widget, before, after, read, expected) => {
	test('redraws when its data prop changes after mount', async () => {
		const { rerender } = render(Widget as any, { props: before });
		await vi.waitFor(() => expect(ec.setOption).toHaveBeenCalled());
		await rerender(after);
		await vi.waitFor(() => expect(read(lastOption())).toEqual(expected));
		expect(ec.init).toHaveBeenCalledTimes(1);
	});
});

describe('gantt', () => {
	test('refreshes when its tasks change after mount', async () => {
		const t1 = [{ id: '1', name: 'Plan', start: '2026-01-01', end: '2026-01-05' }];
		const t2 = [...t1, { id: '2', name: 'Build', start: '2026-01-06', end: '2026-01-10' }];
		const { rerender } = render(GanttChart, { props: { tasks: t1 } });
		await vi.waitFor(() => expect(gantt.ctor).toHaveBeenCalledTimes(1));
		await rerender({ tasks: t2 });
		await vi.waitFor(() => expect(gantt.refresh.mock.lastCall?.[0]).toEqual(t2));
		expect(gantt.ctor).toHaveBeenCalledTimes(1);
	});
});
