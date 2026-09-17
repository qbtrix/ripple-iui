/**
 * @file event-dispatcher.test.ts
 * @description Behavior specs for the Phase B multistep dispatcher.
 * Covers flow, branch, confirm, validate, delay, invoke, async api chaining,
 * run_source chaining, the nesting depth cap, and backwards compatibility with
 * the legacy flat-array dispatch pattern.
 * @changes
 *   - Initial creation for Phase B flow-actions feature
 *   - Added run_source dispatch + on_success / on_error chaining tests (RFC 04)
 *   - Added call_binding dispatch + path/params resolution + on_success /
 *     on_error chaining + optimistic-rollback composition tests (RFC 05 M2a)
 *   - Added invoke_tool dispatch + args resolution + on_success / on_error
 *     chaining tests (#1206 part a — the click-driven sibling of run_source
 *     / call_binding for the new /pockets/{id}/tools/run wire)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// The rune-based StateManager ships from @ripple-ui/svelte; the dispatcher
// is engine code and depends only on `StateStore`, so it is exercised here
// through the engine's own implementation. `state-parity.test.ts` (in the
// svelte package, where both classes are reachable) proves the two agree.
import { createHeadlessStateManager as createStateManager } from '../headless/state.js';
import {
	EventDispatcher,
	FlowAbortError,
	MAX_FLOW_DEPTH,
	CONFIRM_STATE_KEY,
	FLOW_ERROR_STATE_KEY,
	type OnEventCallback
} from './event-dispatcher.js';
import { WidgetRegistry } from './widget-registry.js';
import { EventHandler } from '../schema/event-handler.js';
import type { ResolverContext } from './expression-resolver.js';
import type { RippleEvent } from '../types.js';

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

describe('EventDispatcher — run_source', () => {
	it('emits a run_source event carrying the source name to the host', async () => {
		const seen: RippleEvent[] = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push(e);
			return { ok: true, data: [] };
		});
		const { dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch({ action: 'run_source', source: 'prs' }, ctx());

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({ type: 'run_source', source: 'prs' });
	});

	it('on_success fires with the host data when the host returns ok:true', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: true,
			data: { rows: [1, 2, 3] }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		// `set` with no explicit `value` falls back to the dispatched event
		// payload — here the host's refreshed source data.
		await dispatcher.dispatch(
			{
				action: 'run_source',
				source: 'prs',
				on_success: [{ action: 'set', target: 'list' }]
			},
			ctx()
		);
		expect(state.get('list')).toEqual({ rows: [1, 2, 3] });
	});

	it('on_error fires and _flow_error is written when the host returns ok:false', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: false,
			error: { message: 'source unavailable', status: 503 }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'run_source',
				source: 'prs',
				on_error: [{ action: 'set', target: 'failed', value: true }]
			},
			ctx()
		);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({
			message: 'source unavailable',
			status: 503
		});
		expect(state.get('failed')).toBe(true);
	});

	it('legacy host returning void is treated as success — on_success still runs', async () => {
		const onEvent = vi.fn<OnEventCallback>(() => undefined);
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'run_source',
				source: 'prs',
				on_success: [{ action: 'set', target: 'refreshed', value: true }]
			},
			ctx()
		);
		expect(state.get('refreshed')).toBe(true);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toBeUndefined();
	});
});

describe('EventDispatcher — call_binding', () => {
	it('a call_binding handler parses against the live EventHandler schema', () => {
		const handler = {
			action: 'call_binding',
			binding: 'toggle_task',
			path: '{item.id}',
			params: { done: '{state.draftDone}' },
			on_success: [{ action: 'toast', message: 'Saved', variant: 'success' }],
			on_error: [{ action: 'toast', message: 'Failed', variant: 'error' }]
		};
		const result = EventHandler.safeParse(handler);
		expect(
			result.success,
			result.success ? '' : JSON.stringify(result.error.issues)
		).toBe(true);
	});

	it('emits a call_binding event carrying the binding name to the host', async () => {
		const seen: RippleEvent[] = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push(e);
			return { ok: true, data: null };
		});
		const { dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch({ action: 'call_binding', binding: 'toggle_task' }, ctx());

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({ type: 'call_binding', binding: 'toggle_task' });
	});

	it('resolves {item.id} in path and {state.x} in params before emitting', async () => {
		const seen: RippleEvent[] = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push(e);
			return { ok: true, data: null };
		});
		const { dispatcher, state } = setup({ draftDone: true, label: 'urgent' }, onEvent);

		// `{item.id}` comes from loop context, `{state.x}` from state — both
		// must be resolved client-side before the event leaves the browser.
		const context: ResolverContext = { state: state.state, item: { id: 'task-7' } };
		await dispatcher.dispatch(
			{
				action: 'call_binding',
				binding: 'toggle_task',
				path: '{item.id}',
				params: { done: '{state.draftDone}', tag: '{state.label}' }
			},
			context
		);

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({
			type: 'call_binding',
			binding: 'toggle_task',
			path: 'task-7',
			params: { done: true, tag: 'urgent' }
		});
	});

	it('on_success fires with the host data when the host returns ok:true', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: true,
			data: { id: 'task-7', done: true }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		// `set` with no explicit `value` falls back to the dispatched event
		// payload — here the host's write-result data.
		await dispatcher.dispatch(
			{
				action: 'call_binding',
				binding: 'toggle_task',
				on_success: [{ action: 'set', target: 'saved' }]
			},
			ctx()
		);
		expect(state.get('saved')).toEqual({ id: 'task-7', done: true });
	});

	it('on_error fires and _flow_error is written when the host returns ok:false', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: false,
			error: { message: 'write rejected', status: 409 }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'call_binding',
				binding: 'toggle_task',
				on_error: [{ action: 'set', target: 'failed', value: true }]
			},
			ctx()
		);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({
			message: 'write rejected',
			status: 409
		});
		expect(state.get('failed')).toBe(true);
	});

	it('legacy host returning void is treated as success — on_success still runs', async () => {
		const onEvent = vi.fn<OnEventCallback>(() => undefined);
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'call_binding',
				binding: 'toggle_task',
				on_success: [{ action: 'set', target: 'written', value: true }]
			},
			ctx()
		);
		expect(state.get('written')).toBe(true);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toBeUndefined();
	});

	it('optimistic flow — mutate_state then call_binding with on_error rollback composes with zero new code', async () => {
		// Optimistic UI: flip the task done immediately, call the write binding,
		// and roll the flip back if the host rejects it. This uses only `flow`,
		// `set` (mutate_state), and `call_binding` — no new dispatcher code.
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: false,
			error: { message: 'server said no' }
		}));
		const { state, dispatcher, ctx } = setup({ task: { done: false } }, onEvent);

		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					// optimistic: assume success, update UI now
					{ action: 'set', target: 'task.done', value: true },
					{
						action: 'call_binding',
						binding: 'toggle_task',
						params: { done: true },
						// rollback the optimistic mutation on host failure
						on_error: [{ action: 'set', target: 'task.done', value: false }]
					}
				]
			},
			ctx()
		);

		// Host rejected → on_error rolled the optimistic flip back.
		expect(state.get('task.done')).toBe(false);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({ message: 'server said no' });
	});

	it('optimistic flow — host success keeps the optimistic mutation', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({ ok: true, data: { done: true } }));
		const { state, dispatcher, ctx } = setup({ task: { done: false } }, onEvent);

		await dispatcher.dispatch(
			{
				action: 'flow',
				steps: [
					{ action: 'set', target: 'task.done', value: true },
					{
						action: 'call_binding',
						binding: 'toggle_task',
						params: { done: true },
						on_error: [{ action: 'set', target: 'task.done', value: false }]
					}
				]
			},
			ctx()
		);

		// Host accepted → optimistic flip stands, no rollback.
		expect(state.get('task.done')).toBe(true);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toBeUndefined();
	});
});

describe('EventDispatcher — invoke_tool', () => {
	it('an invoke_tool handler parses against the live EventHandler schema', () => {
		const handler = {
			action: 'invoke_tool',
			tool: 'WebFetch',
			args: { url: '{state.url}', limit: 5 },
			on_success: [{ action: 'toast', message: 'Refreshed', variant: 'success' }],
			on_error: [{ action: 'toast', message: 'Failed', variant: 'error' }]
		};
		const result = EventHandler.safeParse(handler);
		expect(
			result.success,
			result.success ? '' : JSON.stringify(result.error.issues)
		).toBe(true);
	});

	it('emits an invoke_tool event carrying the tool name to the host', async () => {
		const seen: RippleEvent[] = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push(e);
			return { ok: true, data: null };
		});
		const { dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch({ action: 'invoke_tool', tool: 'WebFetch' }, ctx());

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({ type: 'invoke_tool', tool: 'WebFetch' });
	});

	it('resolves {state.x} and {item.id} in args before emitting', async () => {
		const seen: RippleEvent[] = [];
		const onEvent = vi.fn<OnEventCallback>(async (e) => {
			seen.push(e);
			return { ok: true, data: null };
		});
		const { dispatcher, state } = setup({ feedUrl: 'https://api.example.com/feed' }, onEvent);

		// `{state.feedUrl}` from state, `{item.id}` from loop context — both
		// must be resolved client-side before the event leaves the browser.
		const context: ResolverContext = { state: state.state, item: { id: 'feed-7' } };
		await dispatcher.dispatch(
			{
				action: 'invoke_tool',
				tool: 'WebFetch',
				args: { url: '{state.feedUrl}', source_id: '{item.id}', limit: 5 }
			},
			context
		);

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({
			type: 'invoke_tool',
			tool: 'WebFetch',
			args: { url: 'https://api.example.com/feed', source_id: 'feed-7', limit: 5 }
		});
	});

	it('on_success fires with the host data when the host returns ok:true', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: true,
			data: { feed: [{ id: 1 }, { id: 2 }] }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		// `set` with no explicit `value` falls back to the dispatched event
		// payload — here the host's tool-invocation result.
		await dispatcher.dispatch(
			{
				action: 'invoke_tool',
				tool: 'WebFetch',
				on_success: [{ action: 'set', target: 'tile_data' }]
			},
			ctx()
		);
		expect(state.get('tile_data')).toEqual({ feed: [{ id: 1 }, { id: 2 }] });
	});

	it('on_error fires and _flow_error is written when the host returns ok:false', async () => {
		const onEvent = vi.fn<OnEventCallback>(async () => ({
			ok: false,
			error: { message: 'tool not allowlisted', status: 403 }
		}));
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'invoke_tool',
				tool: 'GMAIL_FETCH_EMAILS',
				on_error: [{ action: 'set', target: 'failed', value: true }]
			},
			ctx()
		);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toMatchObject({
			message: 'tool not allowlisted',
			status: 403
		});
		expect(state.get('failed')).toBe(true);
	});

	it('legacy host returning void is treated as success — on_success still runs', async () => {
		const onEvent = vi.fn<OnEventCallback>(() => undefined);
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'invoke_tool',
				tool: 'WebFetch',
				on_success: [{ action: 'set', target: 'invoked', value: true }]
			},
			ctx()
		);
		expect(state.get('invoked')).toBe(true);
		expect(state.get(FLOW_ERROR_STATE_KEY)).toBeUndefined();
	});

	it('on_success chain composes — set then toast both fire after a refresh', async () => {
		// The canonical home-pocket refresh button flow: write the new data
		// into a tile's state path, then toast a confirmation. Uses only
		// existing primitives layered on top of invoke_tool — no new
		// dispatcher code.
		const events: RippleEvent[] = [];
		const onEvent: OnEventCallback = async (e) => {
			events.push(e);
			if (e.type === 'invoke_tool') {
				return { ok: true, data: { rows: [1, 2, 3] } };
			}
			return undefined;
		};
		const { state, dispatcher, ctx } = setup({}, onEvent);

		await dispatcher.dispatch(
			{
				action: 'invoke_tool',
				tool: 'WebFetch',
				args: { url: 'https://api.example.com/data' },
				on_success: [
					{ action: 'set', target: 'tile.rows' },
					{ action: 'toast', message: 'Refreshed', variant: 'success' }
				]
			},
			ctx()
		);

		expect(state.get('tile.rows')).toEqual({ rows: [1, 2, 3] });
		const toastEvents = events.filter((e) => e.type === 'toast');
		expect(toastEvents).toHaveLength(1);
		expect(toastEvents[0]).toMatchObject({ message: 'Refreshed', variant: 'success' });
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
