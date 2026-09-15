/**
 * @file state-parity.test.ts
 * @description Holds `HeadlessStateManager` and the rune-based
 * `StateManager` to identical semantics.
 *
 * Two implementations of one contract drift. The defence is to stop
 * testing them separately: one shared operation script runs against
 * both, and after every step the state snapshot AND the notification
 * trace must match. A behaviour that changes in one and not the other
 * fails here rather than in a host months later.
 *
 * Note what this pins beyond the happy path — delete on a missing
 * branch, set through a non-object (warns, no write), reset clearing
 * keys in place, and empty-path no-ops. Those are the edges where two
 * hand-written implementations actually diverge.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { StateManager } from './state-manager.svelte.js';
import { HeadlessStateManager } from '@ripple-ui/core';
import type { StateStore } from '@ripple-ui/core';

interface Notification {
	path: string;
	value: unknown;
}

/** One scripted step: a name, and the mutation to run on a store. */
interface Step {
	name: string;
	run: (store: StateStore) => void;
}

const SCRIPT: Step[] = [
	{ name: 'set top-level', run: (s) => s.set('count', 1) },
	{ name: 'set nested (auto-creates)', run: (s) => s.set('user.profile.name', 'Ada') },
	{ name: 'set deep sibling', run: (s) => s.set('user.profile.role', 'engineer') },
	{ name: 'update via updater', run: (s) => s.update('count', (c) => (c as number) + 41) },
	{ name: 'update a missing path', run: (s) => s.update('missing.deep', (c) => c ?? 'seeded') },
	{ name: 'set array', run: (s) => s.set('items', [1, 2, 3]) },
	{ name: 'set through a non-object (refused)', run: (s) => s.set('count.nope', true) },
	{ name: 'delete a leaf', run: (s) => s.delete('user.profile.role') },
	{ name: 'delete a missing branch', run: (s) => s.delete('nothing.here') },
	{ name: 'delete a top-level key', run: (s) => s.delete('items') },
	{ name: 'set empty path (no-op)', run: (s) => s.set('', 'ignored') },
	{ name: 'delete empty path (no-op)', run: (s) => s.delete('') },
	{ name: 'reset with new state', run: (s) => s.reset({ fresh: { start: true } }) },
	{ name: 'set after reset', run: (s) => s.set('fresh.again', 2) },
	{ name: 'reset to empty', run: (s) => s.reset() }
];

/** Run the script against a store, capturing a snapshot + notifications per step. */
function runScript(store: StateStore) {
	const notifications: Notification[][] = [];
	const snapshots: unknown[] = [];

	let current: Notification[] = [];
	store.subscribe((path, value) => {
		current.push({ path, value });
	});

	for (const step of SCRIPT) {
		current = [];
		step.run(store);
		notifications.push(current);
		// structuredClone would carry the $state proxy through; JSON gives a
		// plain, comparable snapshot on both sides.
		snapshots.push(JSON.parse(JSON.stringify(store.state)));
	}

	return { notifications, snapshots };
}

describe('state parity: HeadlessStateManager vs StateManager', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('produces identical state after every scripted step', () => {
		// The refused write logs a warning by design; keep the run quiet.
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		const svelte = runScript(new StateManager({ seed: 'value' }));
		const headless = runScript(new HeadlessStateManager({ seed: 'value' }));

		SCRIPT.forEach((step, i) => {
			expect(headless.snapshots[i], `state diverged at step: ${step.name}`).toEqual(
				svelte.snapshots[i]
			);
		});
	});

	it('produces identical notifications after every scripted step', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		const svelte = runScript(new StateManager({ seed: 'value' }));
		const headless = runScript(new HeadlessStateManager({ seed: 'value' }));

		SCRIPT.forEach((step, i) => {
			expect(
				headless.notifications[i],
				`notifications diverged at step: ${step.name}`
			).toEqual(svelte.notifications[i]);
		});
	});

	it('agrees on reads (get / has) across the whole script', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		const svelte = new StateManager({ seed: 'value' });
		const headless = new HeadlessStateManager({ seed: 'value' });
		const paths = ['count', 'user.profile.name', 'user.profile.role', 'items', 'missing.deep', ''];

		for (const step of SCRIPT) {
			step.run(svelte);
			step.run(headless);
			for (const path of paths) {
				expect(headless.get(path), `get("${path}") diverged after: ${step.name}`).toEqual(
					svelte.get(path)
				);
				expect(headless.has(path), `has("${path}") diverged after: ${step.name}`).toBe(
					svelte.has(path)
				);
			}
		}
	});

	it('both clone the initial state rather than aliasing it', () => {
		const initial = { nested: { n: 1 } };

		const svelte = new StateManager(initial);
		const headless = new HeadlessStateManager(initial);

		svelte.set('nested.n', 99);
		headless.set('nested.n', 99);

		expect(initial.nested.n).toBe(1);
		expect(headless.get('nested.n')).toBe(99);
	});

	it('both keep the state object identity across reset', () => {
		// Ripple.svelte hands `state.state` to context once; a reset that
		// swapped the object would strand every existing reference.
		const headless = new HeadlessStateManager({ a: 1 });
		const before = headless.state;
		headless.reset({ b: 2 });
		expect(headless.state).toBe(before);
		expect(headless.state).toEqual({ b: 2 });
	});

	it('both survive a throwing subscriber', () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

		for (const store of [new StateManager(), new HeadlessStateManager()] as StateStore[]) {
			const seen: string[] = [];
			store.subscribe(() => {
				throw new Error('boom');
			});
			store.subscribe((path) => seen.push(path));

			expect(() => store.set('x', 1)).not.toThrow();
			expect(seen).toEqual(['x']);
		}
		expect(errors).toHaveBeenCalled();
	});

	it('unsubscribe stops delivery on both', () => {
		for (const store of [new StateManager(), new HeadlessStateManager()] as StateStore[]) {
			const seen: string[] = [];
			const off = store.subscribe((path) => seen.push(path));
			store.set('a', 1);
			off();
			store.set('b', 2);
			expect(seen).toEqual(['a']);
		}
	});
});
