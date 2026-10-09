// routes/landing-no-fetch.test.ts — The landing makes no network request of its own.
// Renders the whole landing, lets the hero's scrub player autoplay, swaps in
// every recording on the pills and drives the slider, and fails if anything
// but the /live test store origin reached fetch.

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Landing from './+page.svelte';
import { scenarios } from './live/scenarios.js';

vi.setConfig({ testTimeout: 30_000 });
const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 15_000, interval: 50 });

afterEach(() => vi.restoreAllMocks());

test('the hero plays, swaps and scrubs every recording without calling fetch', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));
	const view = render(Landing);

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

	const urls = fetchSpy.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
	expect(urls.filter((u) => !u.startsWith('https://lab.pocketpaw.xyz/'))).toEqual([]);
});
