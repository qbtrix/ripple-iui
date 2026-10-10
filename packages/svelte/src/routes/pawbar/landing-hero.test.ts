// routes/pawbar/landing-hero.test.ts — The landing's hero sits above the chat and its Copy works.
// The headline, lede and install chip render before the first chat message;
// Copy writes the command through navigator.clipboard, and when the clipboard
// is missing (jsdom has none) it selects the command for a manual copy.

import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Landing from '../+page.svelte';

afterEach(() => {
	vi.restoreAllMocks();
	Reflect.deleteProperty(navigator, 'clipboard');
});

const heroCopy = () => screen.getAllByRole('button', { name: 'Copy install command' })[0];

test('the hero leads the chat column, above the first message', () => {
	const view = render(Landing);
	const h1 = view.getByRole('heading', { level: 1 });
	expect(h1.textContent).toBe('Ask for a tool. Ripple builds it while the model is still typing.');
	expect(view.getByText(/Ripple is the open-source generative UI engine\./)).toBeTruthy();
	const firstMessage = view.getAllByText('Replaying a recorded answer that matches.')[0];
	expect(h1.compareDocumentPosition(firstMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(heroCopy().closest('.hero')?.textContent).toContain('$ bun add @ripple-ui/svelte');
});

test('Copy writes the install command to the clipboard', async () => {
	const writeText = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
	render(Landing);
	await fireEvent.click(heroCopy());
	expect(writeText).toHaveBeenCalledWith('bun add @ripple-ui/svelte');
	await vi.waitFor(() => expect(heroCopy().textContent?.trim()).toBe('Copied'));
});

test('without a clipboard, Copy selects the command instead', async () => {
	render(Landing);
	await fireEvent.click(heroCopy());
	await vi.waitFor(() => expect(window.getSelection()?.toString()).toContain('bun add @ripple-ui/svelte'));
});
