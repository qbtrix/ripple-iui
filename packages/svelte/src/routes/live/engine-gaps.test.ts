// routes/live/engine-gaps.test.ts — Widget gaps the /live scenario recordings first hit.
// Each test is the smallest spec that showed the gap, kept as a regression
// guard now that the fixes have landed: a chart redraws when its state
// changes, a flashcard's on_correct reaches the spec, and a streamed slider
// bound before its min/max keeps the bound value.

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

	// A chart that drew once must draw again when the state behind its data
	// changes, or a streamed chart freezes half-drawn and no chart follows state.
	test('redraws when the state behind its data changes', async () => {
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
	// NodeRenderer passes a generic `on_correct` through as `oncorrect`; the
	// widget must read that name for the spec's handler to run.
	test('on_correct runs when "Got It" is clicked', async () => {
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
	// the default 0..100 range; it must not write a clamped value back to state
	// (a bike-gears recording once ended with a 1500 mm wheel instead of 2100).
	test('streamed with bind before props, keeps a bound value above 100', async () => {
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
