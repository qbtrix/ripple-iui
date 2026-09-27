/**
 * @file slim.test.ts
 * @description Behaviour of `SlimHeadless`: it resolves like the full runtime,
 * runs the local state actions and host events, and skips (with a warning)
 * every action that lives in the full `EventDispatcher`.
 *
 * @changes
 *   - 2026-09-27: created with the slim entry.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSlimHeadlessRuntime } from './slim.js';
import { createHeadlessRuntime } from './runtime.js';
import type { UINode } from '../schema/ui-spec.js';
import type { RippleEvent } from '../types.js';

const node = (n: Record<string, unknown>) => n as unknown as UINode;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('SlimHeadless', () => {
	it('resolves the same tree as the full runtime', () => {
		const spec = node({
			type: 'container',
			children: [
				node({ type: 'text', id: 'hi', props: { content: 'Hi {state.name}' } }),
				node({ type: 'if', condition: '{state.show}', children: [node({ type: 'badge', id: 'b' })] }),
				node({
					type: 'each',
					items: '{state.rows}',
					children: [node({ type: 'text', props: { content: '{item.label}' } })]
				})
			]
		});
		const state = { name: 'Ada', show: true, rows: [{ label: 'a' }, { label: 'b' }] };
		const slim = createSlimHeadlessRuntime({ spec, state });
		const full = createHeadlessRuntime({ spec, state });
		expect(slim.tree).toEqual(full.tree);
	});

	it('runs set, toggle, push, remove and open', async () => {
		const spec = node({
			type: 'container',
			children: [
				node({ type: 'button', id: 'set', on_click: { action: 'set', target: 'n', value: '{state.n + 1}' } }),
				node({ type: 'button', id: 'toggle', on_click: { action: 'toggle', target: 'on' } }),
				node({ type: 'button', id: 'push', on_click: { action: 'push', target: 'list', value: 'x' } }),
				node({ type: 'button', id: 'remove', on_click: { action: 'remove', target: 'list', index: 0 } }),
				node({ type: 'button', id: 'open', on_click: { action: 'open', target: 'dialog' } })
			]
		});
		const rt = createSlimHeadlessRuntime({ spec, state: { n: 1, on: false, list: ['a'], dialog: false } });
		for (const id of ['set', 'toggle', 'push', 'remove', 'open']) {
			await rt.dispatch(rt.findById(id)!, 'onclick');
		}
		expect(rt.state.get('n')).toBe(2);
		expect(rt.state.get('on')).toBe(true);
		expect(rt.state.get('list')).toEqual(['x']);
		expect(rt.state.get('dialog')).toBe(true);
	});

	it('sends host events to onEvent in the same shape as the full runtime', async () => {
		const spec = node({
			type: 'button',
			id: 'go',
			on_click: [
				{ action: 'emit', target: 'picked', value: { id: '{state.id}' } },
				{ action: 'navigate', url: '/items/{state.id}' },
				{ action: 'toast', message: 'Saved {state.id}', variant: 'success' }
			]
		});
		const slimEvents: RippleEvent[] = [];
		const fullEvents: RippleEvent[] = [];
		const slim = createSlimHeadlessRuntime({ spec, state: { id: 7 }, onEvent: (e) => void slimEvents.push(e) });
		const full = createHeadlessRuntime({ spec, state: { id: 7 }, onEvent: (e) => void fullEvents.push(e) });
		await slim.dispatch(slim.findById('go')!, 'onclick');
		await full.dispatch(full.findById('go')!, 'onclick');
		expect(slimEvents).toEqual(fullEvents);
		expect(slimEvents.map((e) => e.type)).toEqual(['emit', 'navigate', 'toast']);
	});

	it('gives handlers inside each their loop variables', async () => {
		const spec = node({
			type: 'each',
			items: '{state.rows}',
			item_as: 'row',
			children: [node({ type: 'button', on_click: { action: 'set', target: 'picked', value: '{row.id}' } })]
		});
		const rt = createSlimHeadlessRuntime({ spec, state: { rows: [{ id: 'a' }, { id: 'b' }], picked: '' } });
		await rt.dispatch(rt.tree.nodes[1], 'onclick');
		expect(rt.state.get('picked')).toBe('b');
	});

	it('writes a bound value', async () => {
		const rt = createSlimHeadlessRuntime({ spec: node({ type: 'input', id: 'f', bind: '{state.email}' }), state: { email: '' } });
		const field = rt.findById('f')!;
		await rt.dispatch(field, field.bind!.event, 'a@b.co');
		expect(rt.state.get('email')).toBe('a@b.co');
	});

	it.each([
		['api', { action: 'api', url: '/x' }],
		['run_source', { action: 'run_source', source: 's' }],
		['call_binding', { action: 'call_binding', binding: 'b' }],
		['invoke_tool', { action: 'invoke_tool', tool: 't' }],
		['animate', { action: 'animate', target: 'x', motion: {} }],
		['flow', { action: 'flow', steps: [{ action: 'set', target: 'ran', value: true }] }],
		['branch', { action: 'branch', condition: 'true', then: [{ action: 'set', target: 'ran', value: true }] }],
		['confirm', { action: 'confirm', message: 'Sure?', then: [] }],
		['validate', { action: 'validate', condition: 'false', message: 'no' }],
		['delay', { action: 'delay', ms: 1 }],
		['invoke', { action: 'invoke', target: 'w', method: 'm' }]
	])('skips %s with a warning and calls no host', async (_name, handler) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const onEvent = vi.fn();
		const rt = createSlimHeadlessRuntime({
			spec: node({ type: 'button', id: 'b', on_click: handler }),
			state: { ran: false },
			onEvent
		});
		await rt.dispatch(rt.findById('b')!, 'onclick');
		expect(onEvent).not.toHaveBeenCalled();
		expect(rt.state.get('ran')).toBe(false);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining(`action "${handler.action}" is not available`));
	});

	it('keeps running the next handler after a skipped one', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const rt = createSlimHeadlessRuntime({
			spec: node({
				type: 'button',
				id: 'b',
				on_click: [
					{ action: 'api', url: '/x' },
					{ action: 'set', target: 'after', value: true }
				]
			}),
			state: { after: false }
		});
		await rt.dispatch(rt.findById('b')!, 'onclick');
		expect(rt.state.get('after')).toBe(true);
	});
});
