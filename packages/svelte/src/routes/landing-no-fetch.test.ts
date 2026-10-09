// routes/landing-no-fetch.test.ts — The landing makes no network request of its own.
// Renders the whole landing with its prerender data (minus the git and esbuild
// inputs, which only drop sections), lets the hero's scrub player autoplay,
// swaps in every recording on the pills and drives the slider, edits the live
// spec (a good edit, broken JSON, an unknown widget), and fails if anything but
// the /live test store origin reached fetch. jsdom has no IntersectionObserver,
// so the catalog's mini-renders mount at once and are covered too.

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Landing from './+page.svelte';
import { scenarios } from './live/scenarios.js';
import { buildLandingData } from '$lib/site/landing/data.js';

const data = buildLandingData({ releases: [], sizes: null });

vi.setConfig({ testTimeout: 30_000 });
const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 15_000, interval: 50 });

afterEach(() => vi.restoreAllMocks());

test('the hero plays, swaps and scrubs every recording, and the spec editor re-renders, without calling fetch', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));
	const view = render(Landing, { props: { data } });

	// The bill splitter is fig. 1, at its midpoint.
	expect(view.getByText('fig. 1, bill splitter, 2,794 chars, recorded from Claude Sonnet')).toBeTruthy();
	const slider = () => view.getByRole('slider', { name: 'Stream position' });

	const pills = view.getAllByRole('button', { pressed: false }).filter((b) => b.closest('[aria-label="Recorded streams"]'));
	expect(pills).toHaveLength(scenarios.filter((s) => !s.needsStore).length - 1);
	for (const pill of pills) {
		await fireEvent.click(pill);
		await waitFor(() => expect(pill.getAttribute('aria-pressed')).toBe('true'));
		await fireEvent.keyDown(slider(), { key: 'End' });
		await waitFor(() => expect(slider().getAttribute('aria-valuenow')).toBe(slider().getAttribute('aria-valuemax')));
	}

	// The live spec: a good edit re-renders and keeps clicked state; bad edits keep the last good render.
	const editor = view.container.querySelector('.editor') as HTMLElement;
	const box = editor.querySelector('textarea') as HTMLTextAreaElement;
	const rendered = () => (editor.querySelector('.render') as HTMLElement).textContent ?? '';
	const problem = () => editor.querySelector('[role="status"]')?.textContent ?? '';
	expect(rendered()).toContain('2 of 4');
	const more = [...editor.querySelectorAll('button')].find((b) => b.textContent?.includes('One more'));
	await fireEvent.click(more!);
	await waitFor(() => expect(rendered()).toContain('3 of 4'));
	const spec = box.value;
	await fireEvent.input(box, { target: { value: spec.replace('"goal": 4', '"goal": 6') } });
	await waitFor(() => expect(rendered()).toContain('3 of 6'));
	await fireEvent.input(box, { target: { value: spec.replace('"goal": 4', '"goal": 6').slice(0, -2) } });
	await waitFor(() => expect(problem()).toMatch(/^Not valid JSON/));
	expect(rendered()).toContain('3 of 6');
	await fireEvent.input(box, { target: { value: spec.replace('"type": "metric"', '"type": "meter"') } });
	await waitFor(() => expect(problem()).toBe(`ui.children[0]: widget type "meter" isn't in the catalog`));
	expect(rendered()).toContain('3 of 6');
	await fireEvent.click(view.getByRole('button', { name: 'Reset' }));
	await waitFor(() => expect(problem()).toBe(''));

	const urls = fetchSpy.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
	expect(urls.filter((u) => !u.startsWith('https://lab.pocketpaw.xyz/'))).toEqual([]);
});
