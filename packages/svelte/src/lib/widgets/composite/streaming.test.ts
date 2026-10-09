// @file widgets/composite/streaming.test.ts
// @description Composites mounted through streamSpec(), the way a model
//   delivers them: props arrive a few characters at a time, so a widget renders
//   half-written ids, truncated strings and empty objects before the final
//   spec. No node may show its error box at any point, and props that arrive
//   late (a `defaultView`, a bound step that is not in the list yet) must still
//   take effect. mountStreamed() records error boxes seen mid-stream, which the
//   final remount would otherwise hide.
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { mountStreamed } from '$lib/streaming/__fixtures__/mount-streamed.js';
import ComparisonLayout from './ComparisonLayout.svelte';

afterEach(cleanup);

const pressed = (name: RegExp) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('checklist-layout streamed', () => {
	// Two items without ids, two whose ids share a prefix (a half-written
	// "task-10" reads as "task-1"), a multi-word state and an owner object.
	const spec = {
		ui: {
			type: 'checklist-layout',
			props: {
				title: 'Launch gate',
				items: [
					{ label: 'Pick a domain', state: 'done' },
					{ label: 'Write the copy', state: 'in-progress', owner: { name: 'Ana Ruiz' } },
					{ id: 'task-1', label: 'Security review', state: 'blocked', blockedBy: ['legal'] },
					{ id: 'task-10', label: 'Ship it', state: 'pending', owner: { name: 'Lee Park' } }
				]
			}
		}
	};

	it('never shows an error box and renders every item', async () => {
		const { container, errors } = await mountStreamed(spec);
		expect(errors).toEqual([]);
		const labels = [...container.querySelectorAll('.rcheck-label')].map((n) => n.textContent);
		expect(labels).toEqual(['Pick a domain', 'Write the copy', 'Security review', 'Ship it']);
		expect(container.querySelector('.rcheck-item-in-progress')).not.toBeNull();
	});
});

describe('comparison-layout streamed', () => {
	const spec = {
		ui: {
			type: 'comparison-layout',
			props: {
				title: 'Plans',
				items: [
					{ name: 'Starter', price: '$9', seats: '1', sso: false },
					{ name: 'Team', price: '$29', seats: '10', sso: true },
					{ id: 'pro', name: 'Pro', price: '$59', seats: '25', sso: true },
					{ id: 'pro-max', name: 'Pro Max', price: '$99', seats: '100', sso: true }
				],
				// Arrives after the widget has mounted.
				defaultView: 'table'
			}
		}
	};

	it('never shows an error box and applies a defaultView that arrives late', async () => {
		const { container, errors } = await mountStreamed(spec);
		expect(errors).toEqual([]);
		expect(container.textContent).toContain('Pro Max');
		expect(pressed(/table/i)).toBe('true');
	});
});

describe('comparison-layout defaultView', () => {
	const items = [
		{ id: 'a', name: 'A', seats: '1' },
		{ id: 'b', name: 'B', seats: '2' }
	];

	it('follows defaultView until the visitor picks a view', async () => {
		const r = render(ComparisonLayout, { props: { items, defaultView: 'card' } });
		expect(pressed(/cards/i)).toBe('true');
		await r.rerender({ items, defaultView: 'table' });
		expect(pressed(/table/i)).toBe('true');
		await fireEvent.click(r.getByRole('button', { name: /cards/i }));
		await r.rerender({ items, defaultView: 'card' });
		await r.rerender({ items, defaultView: 'table' });
		await tick();
		expect(pressed(/cards/i)).toBe('true');
	});
});

describe('form-layout streamed', () => {
	// The first section id streams in a few characters at a time; the active
	// section must end up on the finished id, not a truncated one.
	const spec = {
		ui: {
			type: 'form-layout',
			props: {
				title: 'Account',
				sections: [
					{ id: 'profile-details', title: 'Profile' },
					{ id: 'billing', title: 'Billing' }
				]
			}
		}
	};

	it('marks the first section active once its id is complete', async () => {
		const { container, errors } = await mountStreamed(spec, { chunkSize: 4 });
		expect(errors).toEqual([]);
		expect(container.querySelector('.rform-nav-item-active')?.textContent).toContain('Profile');
	});
});

describe('wizard-layout streamed with a bound step', () => {
	// The bound step is set in state before the steps list streams in, so for a
	// while it is not in the list. Once the list is complete the bound step wins.
	const spec = {
		state: { step: 'billing' },
		ui: {
			type: 'wizard-layout',
			bind: '{state.step}',
			props: {
				steps: [
					{ id: 'account', label: 'Account' },
					{ id: 'billing', label: 'Billing' },
					{ id: 'review', label: 'Review' }
				]
			}
		}
	};

	it('shows the bound step once the list arrives', async () => {
		const { container, errors } = await mountStreamed(spec);
		expect(errors).toEqual([]);
		const current = container.querySelector('.rwizard-step-active');
		expect(current?.textContent).toContain('Billing');
	});
});
