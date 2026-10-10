// routes/pawbar/landing-no-fetch.test.ts — Without PUBLIC_PAWBAR_LIVE the landing chat makes no request.
// Renders the whole landing (vitest defines no PUBLIC_PAWBAR_* vars, the
// default build's state), taps a chip and sends a typed prompt (which opens
// Paw OS, never the Paw Bar), and fails if anything but the /live test store
// origin reached fetch.

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Landing from '../+page.svelte';

vi.setConfig({ testTimeout: 30_000 });
const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 15_000, interval: 50 });

afterEach(() => vi.restoreAllMocks());

test('a chip tap and a typed prompt never call fetch without the opt-in flag', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));
	const open = vi.spyOn(window, 'open').mockReturnValue(null);
	const view = render(Landing);
	const send = () => view.getByRole('button', { name: 'Send' });

	// The prerendered bill splitter exchange is already there.
	expect(view.getAllByText('Replaying a recorded answer that matches.')).toHaveLength(1);

	await fireEvent.click(view.getByRole('button', { name: 'Watch savings grow' }));
	await waitFor(() => expect(view.getAllByText('Replaying a recorded answer that matches.')).toHaveLength(2));
	await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull());

	await fireEvent.input(view.getByLabelText('Type a request to continue in Paw OS'), { target: { value: 'something no recording covers' } });
	await fireEvent.click(send());
	expect(open).toHaveBeenCalledOnce();
	expect(new URL(String(open.mock.calls[0][0])).origin).toBe('https://os.pocketpaw.xyz');
	await waitFor(() => expect(view.getByRole('link', { name: /Continue in Paw OS/ })).toBeTruthy());

	const urls = fetchSpy.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
	expect(urls.filter((u) => !u.startsWith('https://lab.pocketpaw.xyz/'))).toEqual([]);
});
