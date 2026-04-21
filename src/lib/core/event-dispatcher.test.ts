/**
 * @file event-dispatcher.test.ts
 * @description Behavior specs for the Phase B multistep dispatcher.
 * Covers flow, branch, confirm, validate, delay, invoke, async api chaining,
 * the nesting depth cap, and backwards compatibility with the legacy
 * flat-array dispatch pattern.
 * @changes
 *   - Initial creation for Phase B flow-actions feature
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStateManager } from './state-manager.svelte.js';
import {
	EventDispatcher,
	FlowAbortError,
	MAX_FLOW_DEPTH,
	CONFIRM_STATE_KEY,
	FLOW_ERROR_STATE_KEY,
	type OnEventCallback
} from './event-dispatcher.js';
import { WidgetRegistry } from './widget-registry.js';
import type { EventHandler } from '../schema/event-handler.js';
import type { ResolverContext } from './expression-resolver.js';

function setup(initial: Record<string, unknown> = {}, onEvent?: OnEventCallback) {
	const state = createStateManager(initial);
	const registry = new WidgetRegistry();
	const dispatcher = new EventDispatcher(state, onEvent, registry);
	const ctx = (): ResolverContext => ({ state: state.state });
	return { state, registry, dispatcher, ctx };
}

describe('EventDispatcher — legacy primitives (backwards compat)', () => {
	it('flat array of [set, emit, toast] dispatches all three in order', async () => {
		const events: string[] = [];
		const onEvent: OnEventCallback = (e) => {
			events.push(`${e.type}:${e.message ?? e.name ?? ''}`);
		};
		const { state, dispatcher, ctx } = setup({}, onEvent);

		const handlers: EventHandler[] = [
			{ action: 'set', target: 'count', value: 5 },
			{ action: 'emit', target: 'changed', value: 'done' },
			{ action: 'toast', message: 'hi' }
		];
		await dispatcher.dispatch(handlers, ctx());

		expect(state.get('count')).toBe(5);
		expect(events).toEqual(['emit:changed', 'toast:hi']);
	});

	it('single non-array handler still dispatches', async () => {
		const { state, dispatcher, ctx } = setup();
		await dispatcher.dispatch({ action: 'set', target: 'ok', value: true }, ctx());
		expect(state.get('ok')).toBe(true);
	});

	it('open sets target to true', async () => {
		const { state, dispatcher, ctx } = setup();
		await dispatcher.dispatch({ action: 'open', target: 'showModal' }, ctx());
		expect(state.get('showModal')).toBe(true);
	});

	it('set resolves {state.x} expressions in value', async () => {
		const { state, dispatcher, ctx } = setup({ name: 'Alice' });
		await dispatcher.dispatch(
			{ action: 'set', target: 'greeting', value: 'Hello {state.name}' },
			ctx()
		);
		expect(state.get('greeting')).toBe('Hello Alice');
	});
});

describe('EventDispatcher — flow', () => {
	it('runs steps in order on success', async () => {
		const { state, dispatcher, ctx } = setup();
		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'set', target: 'a', value: 1 },
					{ action: 'set', target: 'b', value: 2 },
					{ action: 'set', target: 'c', value: 3 }
				]
			},
			ctx()
		);
		expect(state.get('a')).toBe(1);
		expect(state.get('b')).toBe(2);
		expect(state.get('c')).toBe(3);
	});

	it('abort in step 2 skips step 3 and fires on_error', async () => {
		const { state, dispatcher, ctx } = setup();
		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'set', target: 'a', value: 1 },
					{ action: 'validate', condition: 'state.shouldPass', message: 'nope' },
					{ action: 'set', target: 'c', value: 3 }
				],
				on_error: [{ action: 'set', target: 'recovered', value: true }]
			},
			ctx()
		);
		expect(state.get('a')).toBe(1);
		expect(state.get('c')).toBeUndefined();
		expect(state.get('recovered')).toBe(true);
		// Error state key holds the reason for the aborted flow.
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({ message: 'validation_failed' });
	});

	it('enforces the MAX_FLOW_DEPTH nesting cap', async () => {
		const { dispatcher, ctx } = setup();
		// Build 9 nested flows — one deeper than MAX_FLOW_DEPTH=8.
		let innermost: EventHandler = { action: 'set', target: 'x', value: 1 };
		for (let i = 0; i < MAX_FLOW_DEPTH + 1; i++) {
			innermost = { action: 'flow', steps: [innermost] };
		}
		await expect(dispatcher.dispatch(innermost, ctx())).rejects.toThrowError(
			/flow nesting depth exceeded/
		);
	});

	it('flow at exactly MAX_FLOW_DEPTH succeeds', async () => {
		const { state, dispatcher, ctx } = setup();
		let innermost: EventHandler = { action: 'set', target: 'x', value: 1 };
		for (let i = 0; i < MAX_FLOW_DEPTH; i++) {
			innermost = { action: 'flow', steps: [innermost] };
		}
		await dispatcher.dispatch(innermost, ctx());
		expect(state.get('x')).toBe(1);
	});
});

describe('EventDispatcher — branch', () => {
	it('runs `then` when condition is truthy', async () => {
		const { state, dispatcher, ctx } = setup({ count: 10 });
		await dispatcher.dispatch(
			{
				action: 'branch',
				if: 'state.count > 5',
				then: [{ action: 'set', target: 'big', value: true }],
				else: [{ action: 'set', target: 'small', value: true }]
			},
			ctx()
		);
		expect(state.get('big')).toBe(true);
		expect(state.get('small')).toBeUndefined();
	});

	it('runs `else` when condition is falsy', async () => {
		const { state, dispatcher, ctx } = setup({ count: 0 });
		await dispatcher.dispatch(
			{
				action: 'branch',
				if: 'state.count > 5',
				then: [{ action: 'set', target: 'big', value: true }],
				else: [{ action: 'set', target: 'small', value: true }]
			},
			ctx()
		);
		expect(state.get('big')).toBeUndefined();
		expect(state.get('small')).toBe(true);
	});

	it('no-op when falsy and no `else` branch is provided', async () => {
		const { state, dispatcher, ctx } = setup({ count: 0 });
		await dispatcher.dispatch(
			{
				action: 'branch',
				if: 'state.count > 5',
				then: [{ action: 'set', target: 'big', value: true }]
			},
			ctx()
		);
		expect(state.get('big')).toBeUndefined();
	});
});

describe('EventDispatcher — validate', () => {
	it('passes silently when condition is truthy', async () => {
		const onEvent = vi.fn();
		const { dispatcher, ctx } = setup({ email: 'a@b.com' }, onEvent);
		await dispatcher.dispatch(
			{
				action: 'validate',
				condition: 'state.email',
				message: 'Email required'
			},
			ctx()
		);
		expect(onEvent).not.toHaveBeenCalled();
	});

	it('fails → emits toast and the abort is swallowed at the top level', async () => {
		const onEvent = vi.fn();
		const { state, dispatcher, ctx } = setup({ email: '' }, onEvent);
		await dispatcher.dispatch(
			[
				{ action: 'validate', condition: 'state.email', message: 'Email required' },
				// This step should be skipped because the abort fires above it.
				{ action: 'set', target: 'submitted', value: true }
			],
			ctx()
		);
		expect(onEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'toast', message: 'Email required', variant: 'error' })
		);
		expect(state.get('submitted')).toBeUndefined();
	});

	it('variant override is forwarded to the toast', async () => {
		const onEvent = vi.fn();
		const { dispatcher, ctx } = setup({}, onEvent);
		await dispatcher.dispatch(
			{
				action: 'validate',
				condition: 'false',
				message: 'heads up',
				variant: 'warning'
			},
			ctx()
		);
		expect(onEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'toast', variant: 'warning' })
		);
	});

	it('FlowAbortError surfaces to enclosing flow on_error (integration)', async () => {
		const { state, dispatcher, ctx } = setup({});
		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [{ action: 'validate', condition: 'state.nope', message: 'bad' }],
				on_error: [{ action: 'set', target: 'handled', value: true }]
			},
			ctx()
		);
		expect(state.get('handled')).toBe(true);
	});
});

describe('EventDispatcher — delay', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('suspends for the given ms using setTimeout', async () => {
		const { state, dispatcher, ctx } = setup();
		const promise = dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'delay', ms: 1000 },
					{ action: 'set', target: 'after', value: true }
				]
			},
			ctx()
		);

		// Before advancing, post-delay step must not have run yet.
		await Promise.resolve();
		expect(state.get('after')).toBeUndefined();

		await vi.advanceTimersByTimeAsync(1000);
		await promise;
		expect(state.get('after')).toBe(true);
	});
});

describe('EventDispatcher — api async chaining', () => {
	it('on_success fires and response_key is written when host returns ok:true', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: true,
			data: { items: [1, 2] }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'api',
				url: '/api/items',
				response_key: 'list',
				on_success: [{ action: 'set', target: 'loaded', value: true }]
			},
			ctx()
		);
		expect(state.get('list')).toEqual({ items: [1, 2] });
		expect(state.get('loaded')).toBe(true);
	});

	it('on_error fires and _flow_error is written when host returns ok:false', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: false,
			error: { message: 'boom', status: 500 }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'api',
				url: '/api/items',
				on_error: [{ action: 'set', target: 'errorShown', value: true }]
			},
			ctx()
		);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({ message: 'boom', status: 500 });
		expect(state.get('errorShown')).toBe(true);
	});

	it('legacy host returning void: on_success fires, response_key is skipped (no data)', async () => {
		const onEvent = vi.fn<OnEventCallback>(() => undefined);
		const { state, dispatcher, ctx } = setup({}, onEvent);
		await dispatcher.dispatch(
			{
				action: 'api',
				url: '/api/items',
				response_key: 'list',
				on_success: [{ action: 'set', target: 'loaded', value: true }]
			},
			ctx()
		);
		expect(state.get('list')).toBeUndefined();
		expect(state.get('loaded')).toBe(true);
	});

	it('host throwing becomes an error result with on_error chain', async () => {
		const onEvent = vi.fn<OnEventCallback>(() => {
			throw new Error('network dead');
		});
		const { state, dispatcher, ctx } = setup({}, onEvent);
		await dispatcher.dispatch(
			{
				action: 'api',
				url: '/api/items',
				on_error: [{ action: 'set', target: 'errored', value: true }]
			},
			ctx()
		);
		expect(state.get('errored')).toBe(true);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({ message: 'network dead' });
	});

	it('resolves {state.x} in url and body before emitting', async () => {
		const seen: Array<{ url?: string; body?: unknown }> = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push({ url: e.url, body: e.body });
			return { ok: true, data: null };
		});
		const { dispatcher, ctx } = setup({ id: 42, name: 'A' }, onEvent);
		await dispatcher.dispatch(
			{
				action: 'api',
				url: '/api/items/{state.id}',
				method: 'POST',
				body: { name: '{state.name}' }
			},
			ctx()
		);
		expect(seen[0].url).toBe('/api/items/42');
		expect(seen[0].body).toEqual({ name: 'A' });
	});
});

describe('EventDispatcher — invoke', () => {
	it('calls a registered method with args', async () => {
		const fn = vi.fn();
		const { dispatcher, registry, ctx } = setup();
		registry.register('modal1', 'open', fn);

		await dispatcher.dispatch(
			{
				action: 'invoke',
				target: 'modal1',
				method: 'open',
				args: ['quick']
			},
			ctx()
		);
		expect(fn).toHaveBeenCalledWith('quick');
	});

	it('awaits async methods so flow step order is preserved', async () => {
		const order: string[] = [];
		const { dispatcher, registry, ctx } = setup();
		registry.register('svc', 'work', async () => {
			await new Promise((r) => setTimeout(r, 5));
			order.push('work');
		});
		registry.register('log', 'after', () => {
			order.push('after');
		});

		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'invoke', target: 'svc', method: 'work' },
					{ action: 'invoke', target: 'log', method: 'after' }
				]
			},
			ctx()
		);
		expect(order).toEqual(['work', 'after']);
	});

	it('unknown target warns but flow continues', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { state, dispatcher, ctx } = setup();
		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'invoke', target: 'ghost', method: 'nope' },
					{ action: 'set', target: 'continued', value: true }
				]
			},
			ctx()
		);
		expect(state.get('continued')).toBe(true);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('resolves {state.x} expressions in args', async () => {
		const fn = vi.fn();
		const { dispatcher, registry, ctx } = setup({ userId: 9 });
		registry.register('svc', 'load', fn);
		await dispatcher.dispatch(
			{ action: 'invoke', target: 'svc', method: 'load', args: ['{state.userId}'] },
			ctx()
		);
		expect(fn).toHaveBeenCalledWith(9);
	});
});

describe('EventDispatcher — confirm suspension', () => {
	it('writes pending to _ripple_confirm, suspends, and runs on_confirm after resolve', async () => {
		const { state, dispatcher, ctx } = setup();
		const promise = dispatcher.dispatch(
			{
				action: 'confirm',
				message: 'Delete?',
				on_confirm: [{ action: 'set', target: 'deleted', value: true }],
				on_cancel: [{ action: 'set', target: 'deleted', value: false }]
			},
			ctx()
		);

		// Let microtasks flush so the confirm record is written.
		await Promise.resolve();

		const pending = state.get(CONFIRM_STATE_KEY) as {
			pending_id: string;
			message: string;
			confirm_label: string;
			cancel_label: string;
		};
		expect(pending).toMatchObject({
			message: 'Delete?',
			confirm_label: 'Confirm',
			cancel_label: 'Cancel'
		});
		expect(pending.pending_id).toBeTruthy();
		expect(state.get('deleted')).toBeUndefined();

		// Simulate the dialog's confirm button click.
		expect(dispatcher.resolveConfirm(pending.pending_id, 'confirm')).toBe(true);
		await promise;

		expect(state.get('deleted')).toBe(true);
		expect(state.get(CONFIRM_STATE_KEY)).toBeNull();
	});

	it('cancel branch runs when user cancels (and on_cancel is optional)', async () => {
		const { state, dispatcher, ctx } = setup();
		const promise = dispatcher.dispatch(
			{
				action: 'confirm',
				message: 'Sure?',
				on_confirm: [{ action: 'set', target: 'done', value: true }]
			},
			ctx()
		);
		await Promise.resolve();
		const pending = state.get(CONFIRM_STATE_KEY) as { pending_id: string };
		dispatcher.resolveConfirm(pending.pending_id, 'cancel');
		await promise;
		expect(state.get('done')).toBeUndefined();
		expect(state.get(CONFIRM_STATE_KEY)).toBeNull();
	});

	it('resolveConfirm on unknown id returns false', () => {
		const { dispatcher } = setup();
		expect(dispatcher.resolveConfirm('not-a-real-id', 'confirm')).toBe(false);
	});
});

describe('FlowAbortError class', () => {
	it('carries reason and context', () => {
		const err = new FlowAbortError('boom', { who: 'tests' });
		expect(err.reason).toBe('boom');
		expect(err.context).toEqual({ who: 'tests' });
		expect(err.name).toBe('FlowAbortError');
	});
});
