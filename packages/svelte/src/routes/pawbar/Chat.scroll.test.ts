// routes/pawbar/Chat.scroll.test.ts — The chat never scrolls the page. A chip
// send and a streamed reply move only the chat's own container (scrollTo on
// .scroller); nothing calls scrollIntoView or window.scrollTo, either of which
// would walk up and move the page. jsdom has no layout, so this pins the calls,
// not the pixels (the Playwright check in the PR measures those).

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Chat from './Chat.svelte';
import { ChatSession } from './session.svelte.js';

afterEach(() => vi.restoreAllMocks());

test('a chip send scrolls the chat container, never the page', async () => {
	const intoView = vi.fn();
	Element.prototype.scrollIntoView = intoView;
	const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
	const inner = vi.fn();
	Element.prototype.scrollTo = inner as unknown as Element['scrollTo'];

	const session = new ChatSession(async function* () {
		yield { event: 'chunk', data: { content: 'Here you go.', type: 'text' } };
		yield { event: 'stream_end', data: { cancelled: false } };
	});
	const view = render(Chat, { session, suggestions: [{ id: 'a', title: 'Try it', prompt: 'Make me a thing' }] });
	await fireEvent.click(view.getByRole('button', { name: 'Try it' }));
	await vi.waitFor(() => expect(view.getByText('Here you go.')).toBeTruthy());

	await vi.waitFor(() => expect(inner).toHaveBeenCalled());
	expect(inner.mock.contexts.every((el) => (el as Element).classList.contains('scroller'))).toBe(true);
	expect(intoView).not.toHaveBeenCalled();
	expect(pageScroll).not.toHaveBeenCalled();
});
