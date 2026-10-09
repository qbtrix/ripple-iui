// routes/playground/playground-no-fetch.test.ts — Without PUBLIC_PAWBAR_LIVE the playground makes no request.
// Renders the page as the default build has it (vitest defines no
// PUBLIC_PAWBAR_* vars), taps a recorded prompt card and sends a typed prompt
// no recording covers, and fails if anything reached fetch. Also checks the
// page says plainly that it is replaying recordings, and that the page-level
// shortcuts reach the composer and the session (/ and Esc).

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Playground from './+page.svelte';

vi.setConfig({ testTimeout: 30_000 });
const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 15_000, interval: 50 });

afterEach(() => vi.restoreAllMocks());

test('a prompt card and a typed prompt never call fetch without the opt-in flag', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));
	const view = render(Playground);
	expect(view.getByText('Recorded answers')).toBeTruthy();

	await fireEvent.click(view.getByRole('button', { name: /Watch savings grow/ }));
	await waitFor(() => expect(view.getByText(/This is a recorded answer to a request like yours/)).toBeTruthy());
	await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull());

	await fireEvent.input(view.getByLabelText('Describe the tool you want'), { target: { value: 'something no recording covers' } });
	await fireEvent.click(view.getByRole('button', { name: 'Send' }));
	await waitFor(() => expect(view.getByText('Nothing recorded matches that yet, so this plays the recorded bill splitter.')).toBeTruthy());
	await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull());

	expect(fetchSpy).not.toHaveBeenCalled();
});

test('/ focuses the composer and Esc stops a stream', async () => {
	vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));
	const view = render(Playground);
	const box = view.getByLabelText('Describe the tool you want');

	await fireEvent.keyDown(document.body, { key: '/' });
	expect(document.activeElement).toBe(box);

	await fireEvent.click(view.getByRole('button', { name: /Split the bill/ }));
	await waitFor(() => expect(view.getByRole('button', { name: 'Stop' })).toBeTruthy());
	await fireEvent.keyDown(document.body, { key: 'Escape' });
	await waitFor(() => expect(view.getByText('Stopped.')).toBeTruthy());
});
