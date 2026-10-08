// routes/pawbar/Chat.test.ts — A card streamed into <Ripple> through the landing chat.
// Taps a suggestion chip, streams a card over card.delta, and proves: the
// half-built card already renders and its local state works, its host event
// (emit) is inert while streaming, and after card.final the validated card is
// interactive and its emit reaches the page.

import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import Chat from './Chat.svelte';
import { ChatSession } from './session.svelte.js';

const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

const card = {
	state: { on: false },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: [
			{ type: 'text', props: { text: "{state.on ? 'Lamp on' : 'Lamp off'}" } },
			{ type: 'button', props: { label: 'Toggle' }, on_click: { action: 'toggle', target: 'on' } },
			{ type: 'button', props: { label: 'Pick' }, on_click: { action: 'emit', target: 'picked' } }
		]
	}
};

test('a streamed card renders, stays inert to the host until final, then works', async () => {
	let release!: () => void;
	const gate = new Promise<void>((r) => (release = r));
	const wire = JSON.stringify(card);
	const session = new ChatSession(async function* () {
		yield { event: 'chunk', data: { content: 'Here is a lamp.', type: 'text' } };
		yield { event: 'card.start', data: { card_id: 'lamp' } };
		for (let i = 0; i < wire.length; i += 40) yield { event: 'card.delta', data: { card_id: 'lamp', text: wire.slice(i, i + 40) } };
		await gate;
		yield { event: 'card.final', data: { card_id: 'lamp', card } };
		yield { event: 'stream_end', data: { assistant_message_id: 'm', cancelled: false } };
	});
	const view = render(Chat, { session, suggestions: [{ id: 'lamp', title: 'A lamp', prompt: 'Make me a lamp switch' }] });

	await fireEvent.click(view.getByRole('button', { name: 'A lamp' }));
	expect(await view.findByText('Make me a lamp switch')).toBeTruthy();
	await waitFor(() => expect(view.getByText('Lamp off')).toBeTruthy());
	expect(view.getByText('Here is a lamp.')).toBeTruthy();

	// While streaming: local state works, the host event does not fire.
	await fireEvent.click(view.getByRole('button', { name: 'Toggle' }));
	await waitFor(() => expect(view.getByText('Lamp on')).toBeTruthy());
	await fireEvent.click(view.getByRole('button', { name: 'Pick' }));
	expect(view.queryByText(/sent/i)).toBeNull();

	release();
	await waitFor(() => expect(view.queryByText('Building')).toBeNull());
	await waitFor(() => expect(view.getByRole('button', { name: 'Pick' })).toBeTruthy());

	// After final: the validated card mounts fresh from its own state, is live,
	// and its emit reaches the page.
	await waitFor(() => expect(view.getByText('Lamp off')).toBeTruthy());
	await fireEvent.click(view.getByRole('button', { name: 'Toggle' }));
	await waitFor(() => expect(view.getByText('Lamp on')).toBeTruthy());
	await fireEvent.click(view.getByRole('button', { name: 'Pick' }));
	await waitFor(() => expect(view.getByRole('status').textContent).toContain('emit: picked'));
});

test('a rejected card leaves a short note instead of a broken card', async () => {
	const session = new ChatSession(async function* () {
		yield { event: 'card.start', data: { card_id: 'x' } };
		yield { event: 'card.delta', data: { card_id: 'x', text: '{"ui":{"type":"nope"' } };
		yield { event: 'card.rejected', data: { card_id: 'x', reason: 'truncated' } };
		yield { event: 'stream_end', data: { cancelled: false } };
	});
	const view = render(Chat, { session });
	await session.send('hi');
	await waitFor(() => expect(view.getByText(/cut off before it finished/)).toBeTruthy());
});
