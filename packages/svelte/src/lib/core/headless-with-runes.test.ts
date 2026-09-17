/**
 * @file headless-with-runes.test.ts
 * @description The headless runtime driven by the RUNE store.
 *
 * This assertion cannot live in `@ripple-ui/core` — `$state` needs the Svelte
 * compiler, and that package deliberately has none. But it is exactly the
 * claim that makes `StateStore` worth having: the runtime depends on the
 * interface, so a Svelte host can hand it the rune-based `StateManager` and
 * get the headless query and dispatch API with fine-grained reactivity.
 *
 * It is the cross-package half of the split. `core/state-parity.test.ts`
 * proves the two stores behave identically in isolation; this proves the
 * runtime actually accepts either one.
 *
 * @changes
 *   - 2026-08-25: created (monorepo split, wave 2). Moved out of the engine's
 *     runtime.test.ts, which now uses the engine's own store.
 */

import { describe, it, expect } from 'vitest';
import { RippleHeadless } from '@ripple-ui/core/headless';
import type { UINode } from '@ripple-ui/core';
import { StateManager } from './state-manager.svelte.js';

const counterSpec = {
	type: 'container',
	children: [
		{ type: 'text', id: 'label', props: { content: 'Count: {state.count}' } },
		{
			type: 'button',
			id: 'inc',
			on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
		}
	]
} as unknown as UINode;

describe('headless runtime over the rune store', () => {
	it('resolves against Svelte state', () => {
		const store = new StateManager({ count: 10 });
		const rt = new RippleHeadless({ spec: counterSpec, store });
		expect(rt.findById('label')?.props.content).toBe('Count: 10');
	});

	it('dispatches through the rune store and re-resolves', async () => {
		const store = new StateManager({ count: 10 });
		const rt = new RippleHeadless({ spec: counterSpec, store });

		await rt.dispatch(rt.findById('inc')!, 'onclick');

		expect(store.get('count')).toBe(11);
		expect(rt.findById('label')?.props.content).toBe('Count: 11');
	});

	it('external writes to the store invalidate the tree', () => {
		// The runtime subscribes to the store, so a host mutating state directly
		// (not through a dispatch) must still be reflected on the next read.
		const store = new StateManager({ count: 1 });
		const rt = new RippleHeadless({ spec: counterSpec, store });
		expect(rt.findById('label')?.props.content).toBe('Count: 1');

		store.set('count', 99);
		expect(rt.findById('label')?.props.content).toBe('Count: 99');
	});

	it('notifies tree subscribers on a rune-store write', () => {
		const store = new StateManager({ count: 0 });
		const rt = new RippleHeadless({ spec: counterSpec, store });
		const seen: unknown[] = [];
		rt.subscribe((tree) => {
			seen.push(tree.nodes[0].children.find((n) => n.id === 'label')?.props.content);
		});

		store.set('count', 7);
		expect(seen).toEqual(['Count: 7']);
	});
});
