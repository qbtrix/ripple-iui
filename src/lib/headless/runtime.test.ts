/**
 * @file runtime.test.ts
 * @description End-to-end behaviour of `RippleHeadless`.
 *
 * This is the layer where the three pieces meet: a dispatch writes
 * state, the write invalidates the memo, and the next tree read shows
 * the consequence. The tests are written as "act on the spec, observe
 * the new tree" — i.e. what a host actually does — rather than poking
 * internals.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import { describe, it, expect, vi } from 'vitest';
import { createHeadlessRuntime, RippleHeadless } from './runtime.js';
import { StateManager } from '../core/state-manager.svelte.js';
import type { UINode } from '../schema/ui-spec.js';
import type { RippleEvent } from '../types.js';

const node = (n: Partial<UINode> & { type?: string }) => n as UINode;

/** A counter app: a label bound to state and a button that increments it. */
const counterSpec = node({
	type: 'container',
	children: [
		node({ type: 'text', id: 'label', props: { content: 'Count: {state.count}' } }),
		node({
			type: 'button',
			id: 'inc',
			props: { label: 'Add' },
			on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
		})
	]
});

describe('RippleHeadless', () => {
	it('resolves the spec against initial state on first read', () => {
		const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
		expect(rt.findById('label')?.props.content).toBe('Count: 0');
	});

	it('re-resolves after a dispatch mutates state', async () => {
		const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });

		await rt.dispatch(rt.findById('inc')!, 'onclick');
		expect(rt.findById('label')?.props.content).toBe('Count: 1');

		await rt.dispatch(rt.findById('inc')!, 'onclick');
		expect(rt.findById('label')?.props.content).toBe('Count: 2');
	});

	it('memoizes the tree until state changes', () => {
		const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
		const first = rt.tree;
		expect(rt.tree).toBe(first);

		rt.state.set('count', 1);
		expect(rt.tree).not.toBe(first);
	});

	it('invalidates on setSpec and setData', () => {
		const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
		const first = rt.tree;

		rt.setSpec(node({ type: 'text', props: { content: 'replaced' } }));
		expect(rt.tree).not.toBe(first);
		expect(rt.tree.nodes[0].props.content).toBe('replaced');

		const second = rt.tree;
		rt.setData({ anything: 1 });
		expect(rt.tree).not.toBe(second);
	});

	describe('bound input', () => {
		const formSpec = node({
			type: 'input',
			id: 'email',
			bind: '{state.form.email}',
			on_change: { action: 'set', target: 'touched', value: true }
		});

		it('writes the bound path on the bind contract event', async () => {
			const rt = createHeadlessRuntime({ spec: formSpec, state: {} });
			await rt.dispatch(rt.findById('email')!, 'onchange', 'ada@example.com');

			expect(rt.state.get('form.email')).toBe('ada@example.com');
			expect(rt.findById('email')?.bind?.value).toBe('ada@example.com');
		});

		it('runs the author handler after the bound write, not before', async () => {
			// NodeRenderer writes the path first, so a handler reading that path
			// sees the NEW value. Order is observable, so it gets pinned.
			const seen: unknown[] = [];
			const rt = createHeadlessRuntime({
				spec: node({
					type: 'input',
					id: 'q',
					bind: '{state.query}',
					on_change: { action: 'emit', target: 'searched', value: '{state.query}' }
				}),
				state: { query: 'old' },
				onEvent: (e: RippleEvent) => {
					seen.push((e as { payload?: unknown }).payload);
				}
			});

			await rt.dispatch(rt.findById('q')!, 'onchange', 'new');
			expect(seen).toEqual(['new']);
		});

		it('does not write the path for a non-bind event', async () => {
			const rt = createHeadlessRuntime({ spec: formSpec, state: {} });
			await rt.dispatch(rt.findById('email')!, 'onfocus', 'ignored');
			expect(rt.state.get('form.email')).toBeUndefined();
		});
	});

	it('routes host-delegated actions to onEvent', async () => {
		const events: RippleEvent[] = [];
		const rt = createHeadlessRuntime({
			spec: node({
				type: 'button',
				id: 'go',
				on_click: { action: 'navigate', url: '/next' }
			}),
			state: {},
			onEvent: (e) => {
				events.push(e);
			}
		});

		await rt.dispatch(rt.findById('go')!, 'onclick');
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ type: 'navigate', url: '/next' });
	});

	it('emit-only degrades animate without a DOM, rather than throwing', async () => {
		// No `getAnimateRoot` is supplied headlessly, so the built-in pulse is
		// skipped and observers still get the event. This is the one action
		// whose behaviour legitimately differs from the browser runtime.
		const events: RippleEvent[] = [];
		const rt = createHeadlessRuntime({
			spec: node({
				type: 'button',
				id: 'go',
				on_click: {
					action: 'animate',
					target: 'card',
					motion: {
						hover: { scale: 1.05 },
						transition: { preset: 'snappy' },
						reduceMotion: 'cross-fade'
					}
				}
			}),
			state: {},
			onEvent: (e) => {
				events.push(e);
			}
		});

		await expect(rt.dispatch(rt.findById('go')!, 'onclick')).resolves.toBeUndefined();
		expect(events[0]).toMatchObject({ type: 'animate', target: 'card' });
	});

	it('runs a multi-step flow, in order', async () => {
		const rt = createHeadlessRuntime({
			spec: node({
				type: 'button',
				id: 'go',
				on_click: [
					{ action: 'set', target: 'step', value: 1 },
					{ action: 'set', target: 'done', value: '{state.step}' }
				]
			}),
			state: {}
		});

		await rt.dispatch(rt.findById('go')!, 'onclick');
		expect(rt.state.get('step')).toBe(1);
		expect(rt.state.get('done')).toBe(1);
	});

	it('is a no-op when the node has no handler for the event', async () => {
		const rt = createHeadlessRuntime({ spec: node({ type: 'text', id: 't' }), state: {} });
		await expect(rt.dispatch(rt.findById('t')!, 'onclick')).resolves.toBeUndefined();
	});

	describe('subscriptions', () => {
		it('notifies tree subscribers with the re-resolved tree', async () => {
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			const contents: unknown[] = [];
			rt.subscribe((tree) => {
				const label = tree.nodes[0].children.find((n) => n.id === 'label');
				contents.push(label?.props.content);
			});

			await rt.dispatch(rt.findById('inc')!, 'onclick');
			expect(contents).toEqual(['Count: 1']);
		});

		it('stops notifying after unsubscribe', () => {
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			const fn = vi.fn();
			const off = rt.subscribe(fn);

			rt.state.set('count', 1);
			off();
			rt.state.set('count', 2);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('survives a throwing tree subscriber', () => {
			const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			const good = vi.fn();
			rt.subscribe(() => {
				throw new Error('subscriber exploded');
			});
			rt.subscribe(good);

			expect(() => rt.state.set('count', 1)).not.toThrow();
			expect(good).toHaveBeenCalledTimes(1);
			expect(errors).toHaveBeenCalled();
			errors.mockRestore();
		});

		it('exposes raw state notifications too', () => {
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			const paths: string[] = [];
			rt.subscribeState((path) => paths.push(path));

			rt.state.set('count', 5);
			expect(paths).toEqual(['count']);
		});

		it('resolves the tree lazily when nobody is watching', () => {
			// A pull-based runtime must not do resolution work per state write
			// just in case someone reads later — that would make a 1000-step
			// batch cost 1000 tree walks.
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			rt.tree; // prime
			const spy = vi.spyOn(rt.state, 'state', 'get');

			for (let i = 0; i < 10; i++) rt.state.set('count', i);
			const callsBeforeRead = spy.mock.calls.length;

			rt.tree;
			expect(spy.mock.calls.length).toBeGreaterThan(callsBeforeRead);
			spy.mockRestore();
		});
	});

	describe('queries', () => {
		it('walks the tree depth-first', () => {
			const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 0 } });
			expect([...rt.walk()].map((n) => n.type)).toEqual(['container', 'text', 'button']);
		});

		it('findByType collects every match', () => {
			const rt = createHeadlessRuntime({
				spec: node({
					type: 'each',
					items: '{state.rows}',
					children: [node({ type: 'text', props: { content: '{item}' } })]
				}),
				state: { rows: ['a', 'b', 'c'] }
			});
			expect(rt.findByType('text')).toHaveLength(3);
		});

		it('findById returns undefined for a node that is not rendered', () => {
			const rt = createHeadlessRuntime({
				spec: node({ type: 'text', id: 'hidden', show: '{state.no}' }),
				state: { no: false }
			});
			expect(rt.findById('hidden')).toBeUndefined();
		});
	});

	it('accepts an injected store, including the rune-based one', async () => {
		// Same runtime, Svelte state. This is the path a Svelte host takes when
		// it wants the headless query/dispatch API with fine-grained reactivity.
		const store = new StateManager({ count: 10 });
		const rt = new RippleHeadless({ spec: counterSpec, store });

		expect(rt.findById('label')?.props.content).toBe('Count: 10');
		await rt.dispatch(rt.findById('inc')!, 'onclick');
		expect(store.get('count')).toBe(11);
		expect(rt.findById('label')?.props.content).toBe('Count: 11');
	});

	it('exposes state through the store contract, not a copy', () => {
		const rt = createHeadlessRuntime({ spec: counterSpec, state: { count: 3 } });
		rt.state.set('count', 4);
		expect(rt.tree.state.count).toBe(4);
	});
});
