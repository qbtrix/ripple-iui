// routes/pawbar/Chat.test.ts — A card streamed into <Ripple> through the landing chat.
// Taps a suggestion chip, streams a card over card.delta, and proves: the
// half-built card already renders and its local state works, its host event
// (emit) is inert while streaming, and after card.final the validated card is
// interactive and its emit reaches the page. A flow card walks its steps with no
// call to the chat, then its last step sends the answers as the visitor's message,
// including a live model card the server accepted (fixtures/trip-flow-card.json).

import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import Chat from './Chat.svelte';
import { ChatSession } from './session.svelte.js';
import { laptopFlowCard, tripFlowCard } from './flow-cards.js';
import liveTripCard from './fixtures/trip-flow-card.json';

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
		yield { event: 'card.delta', data: { card_id: 'x', text: '{"ui":{"type":"text"' } };
		yield { event: 'card.rejected', data: { card_id: 'x', reason: 'truncated' } };
		yield { event: 'stream_end', data: { cancelled: false } };
	});
	const view = render(Chat, { session });
	await session.send('hi');
	await waitFor(() => expect(view.getByText(/cut off before it finished/)).toBeTruthy());
});

test('a flow card runs its steps in the page, then sends the answers as the visitor', async () => {
	const sent: string[] = [];
	const session = new ChatSession(async function* (message) {
		sent.push(message);
		if (sent.length > 1) {
			yield { event: 'chunk', data: { content: 'Here are three that fit.' } };
			return;
		}
		yield { event: 'card.start', data: { card_id: 'f' } };
		yield { event: 'card.delta', data: { card_id: 'f', text: JSON.stringify(laptopFlowCard) } };
		yield { event: 'card.final', data: { card_id: 'f', card: laptopFlowCard } };
	});
	const view = render(Chat, { session });
	await session.send('Help me choose a laptop');
	await waitFor(() => expect(view.getByText('Creative work')).toBeTruthy());
	await fireEvent.click(view.getByText('Creative work'));
	await waitFor(() => expect(view.getByText('Over $1,500')).toBeTruthy());
	await fireEvent.click(view.getByText('Over $1,500'));
	await waitFor(() => expect(view.getByText('Not really')).toBeTruthy());
	expect(sent).toEqual(['Help me choose a laptop']);
	await fireEvent.click(view.getByText('Not really'));
	const message =
		'Recommend a laptop for me from these answers. What will you use it for most? Creative work. What is your budget? Over $1,500. Does weight matter? Not really.';
	await waitFor(() => expect(sent).toEqual(['Help me choose a laptop', message]));
	await waitFor(() => expect(view.getByText('Here are three that fit.')).toBeTruthy());
	const mine = [...view.container.querySelectorAll('.ask')].map((p) => p.textContent);
	expect(mine).toEqual(['Help me choose a laptop', message]);
});

test("a live model's select flow (emit flow.next, then flow.submit, with a selection) completes", async () => {
	const sent: string[] = [];
	const wire = JSON.stringify(liveTripCard);
	const session = new ChatSession(async function* (message) {
		sent.push(message);
		if (sent.length > 1) return;
		yield { event: 'card.start', data: { card_id: 'c1' } };
		for (let i = 0; i < wire.length; i += 20) yield { event: 'card.delta', data: { card_id: 'c1', text: wire.slice(i, i + 20) } };
		yield { event: 'card.final', data: { card_id: 'c1', card: liveTripCard } };
	});
	const view = render(Chat, { session });
	await session.send('Help me plan a trip step by step');
	await waitFor(() => expect(view.container.querySelector('.card')?.getAttribute('data-status')).toBe('final'));
	await fireEvent.click(await view.findByText('Food'));
	await fireEvent.click(await view.findByText('A week'));
	await waitFor(() =>
		expect(sent).toEqual(['Help me plan a trip step by step', 'Plan a trip for me with these answers. What kind of trip? Food. How many days? A week.'])
	);
});

test('a form step holds the flow until its required fields are filled', async () => {
	const sent: string[] = [];
	const session = new ChatSession(async function* (message) {
		sent.push(message);
		if (sent.length > 1) return;
		yield { event: 'card.start', data: { card_id: 't' } };
		yield { event: 'card.final', data: { card_id: 't', card: tripFlowCard } };
	});
	const view = render(Chat, { session });
	await session.send('Help me plan a trip step by step');
	await waitFor(() => expect(view.getByText('Food')).toBeTruthy());
	await fireEvent.click(view.getByText('Food'));
	const plan = await view.findByRole('button', { name: 'Plan my trip' });
	await fireEvent.click(plan);
	await waitFor(() => expect(view.getByRole('alert').textContent).toContain('City is required'));
	const [city, days, budget] = view.container.querySelectorAll('.card input');
	await fireEvent.input(city, { target: { value: 'Lisbon' } });
	await fireEvent.input(days, { target: { value: '4' } });
	await fireEvent.input(budget, { target: { value: '1500' } });
	expect(sent).toHaveLength(1);
	await fireEvent.click(plan);
	await waitFor(() =>
		expect(sent[1]).toBe('Plan a trip for me with these answers (budget in US dollars). What kind of trip? Food. City: Lisbon. Days: 4. Budget: 1500.')
	);
});

test('a step-by-step chip says so, and sends its prompt', async () => {
	const sent: string[] = [];
	const session = new ChatSession(async function* (message) {
		sent.push(message);
		yield { event: 'stream_end', data: { cancelled: false } };
	});
	const view = render(Chat, {
		session,
		suggestions: [
			{ id: 'trip', title: 'Plan a trip with me', prompt: 'Help me plan a trip step by step', steps: true },
			{ id: 'bill', title: 'Split the bill', prompt: 'Split it' }
		]
	});
	expect(view.getByRole('button', { name: 'Split the bill' })).toBeTruthy();
	await fireEvent.click(view.getByRole('button', { name: 'Plan a trip with me step by step' }));
	await waitFor(() => expect(sent).toEqual(['Help me plan a trip step by step']));
});
