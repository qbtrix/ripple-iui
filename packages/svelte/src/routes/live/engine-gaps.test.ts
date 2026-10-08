// routes/live/engine-gaps.test.ts — Widget gaps the /live scenarios hit while recording.
// Each is a `test.fails` that reproduces the gap with the smallest spec. The
// recorder's system prompt (scripts/record-scenario.ts, KNOWN WIDGET GAPS)
// steers the model around them. When a fix lands, its test starts passing,
// vitest reports it, and it flips to `test` alongside dropping the prompt rule.

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';
import { replay } from './replay.js';

const echarts = vi.hoisted(() => ({ setOption: vi.fn() }));
vi.mock('echarts', () => ({
	init: () => ({ setOption: echarts.setOption, resize() {}, dispose() {} })
}));

const button = (c: HTMLElement, label: string) =>
	[...c.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

describe('chart', () => {
	afterEach(() => vi.unstubAllGlobals());

	// Chart.svelte keeps the echarts instance in a plain `let`, so its redraw
	// $effect reads `chart` as null on the first run, never reads `data`, and
	// never re-runs. The chart keeps whatever data it had at mount: a streamed
	// chart can freeze half-drawn, and no chart follows state.
	test.fails('redraws when the state behind its data changes', async () => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(private cb: ResizeObserverCallback) {}
				observe() {
					this.cb([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this as never);
				}
				disconnect() {}
				unobserve() {}
			}
		);
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
		await vi.waitFor(() => expect(echarts.setOption).toHaveBeenCalled());
		const first = JSON.stringify(echarts.setOption.mock.lastCall![0].series);
		await fireEvent.click(button(container, 'Bump'));
		await tick();
		await vi.waitFor(() => expect(JSON.stringify(echarts.setOption.mock.lastCall![0].series)).not.toBe(first));
	});
});

describe('flashcard', () => {
	// NodeRenderer passes a generic `on_correct` through as `oncorrect`, but
	// Flashcard reads `onCorrect` (Timer's `on_complete` has the same casing
	// mismatch with `onComplete`). The widget's own buttons work; the spec's
	// handler never runs.
	test.fails('on_correct runs when "Got It" is clicked', async () => {
		const spec = {
			state: { score: 0 },
			ui: {
				type: 'flex',
				children: [
					{
						type: 'flashcard',
						props: { front: 'Hello', back: 'Hola' },
						on_correct: { action: 'set', target: 'score', value: '{state.score + 1}' }
					},
					{ type: 'text', props: { text: 'Score {state.score}' } }
				]
			}
		};
		const { container } = render(Ripple, { props: { spec } });
		await tick();
		await fireEvent.click(container.querySelector('.flashcard')!);
		await fireEvent.click(await vi.waitFor(() => button(container, 'Got It') ?? Promise.reject(new Error('no Got It'))));
		await vi.waitFor(() => expect(container.textContent).toContain('Score 1'), { timeout: 500 });
	});
});

describe('slider', () => {
	// A streamed slider whose `bind` arrives before its `min`/`max` mounts with
	// the default 0..100 range, clamps the bound value into it and writes that
	// back to state. The real min/max land a moment later, but the state value
	// is already lost (the bike-gears recording ended with a 1500 mm wheel
	// instead of 2100).
	test.fails('streamed with bind before props, keeps a bound value above 100', async () => {
		const chunks = [
			'{"state":{"w":2100},"ui":{"type":"flex","children":[{"type":"text","props":{"text":"W {state.w}"}},',
			'{"type":"slider","bind":"{state.w}","props":{"label":"Wheel",',
			'"min":1500,"max":2300,"step":10}}]}}'
		].map((text, i) => ({ t: i, text }));
		const fixture = { id: 'x', title: 'x', prompt: 'x', model: 'x', recordedAt: '', chunks };
		const store = streamSpec(replay(fixture, { speed: Infinity }), { throttleMs: 0 });
		const { container } = render(Ripple, { props: { streaming: store } });
		await vi.waitFor(() => expect(store.done).toBe(true));
		await tick();
		expect(container.textContent).toContain('W 2100');
	});
});
