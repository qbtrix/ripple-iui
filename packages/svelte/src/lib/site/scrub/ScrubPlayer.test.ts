// lib/site/scrub/ScrubPlayer.test.ts — The player's host hooks, mounted on a real recording.
// /live's burger checkout depends on the render's events reaching the page
// through the player, with the page's return value going back to Ripple.
// `panes` must show only the requested pane in the markup's data hook.

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import ScrubPlayer from './ScrubPlayer.svelte';
import orderBurger from '../../../routes/live/fixtures/order-burger.json';

vi.setConfig({ testTimeout: 20_000 });

const type = async (container: HTMLElement, placeholder: string, value: string) => {
	const el = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
	el.value = value;
	await fireEvent.input(el);
	await fireEvent.change(el);
};

describe('ScrubPlayer', () => {
	test('forwards the render events to onEvent at the end frame', async () => {
		const onEvent = vi.fn(() => ({ ok: true }));
		const { container } = render(ScrubPlayer, { fixture: orderBurger, start: 1, onEvent });
		await vi.waitFor(() => expect(container.querySelector('input[placeholder="Your name"]')).not.toBeNull(), { timeout: 5000 });
		await type(container, 'Your name', 'Sam');
		await type(container, 'you@example.com', 'sam@example.com');
		await type(container, 'Phone number', '555 0100');
		const checkout = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Checkout')!;
		await fireEvent.click(checkout);
		await tick();
		await vi.waitFor(() => expect(onEvent.mock.calls.some(([e]: [{ type: string }]) => e.type === 'api')).toBe(true));
	});

	test('panes defaults to both and takes the page value', () => {
		const a = render(ScrubPlayer, { fixture: orderBurger });
		expect(a.container.querySelector('.panes')?.getAttribute('data-show')).toBe('both');
		const b = render(ScrubPlayer, { fixture: orderBurger, panes: 'spec' });
		expect(b.container.querySelector('.panes')?.getAttribute('data-show')).toBe('spec');
	});
});
