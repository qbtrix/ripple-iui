/**
 * @file base-dispatcher.ts
 * @description The part of the event dispatcher every runtime needs: the
 * dispatch loop, the local state actions (`set`, `toggle`, `push`, `remove`,
 * `open`) and the fire-and-forget host actions (`navigate`, `toast`, `emit`,
 * `pin`, `unpin`).
 *
 * `EventDispatcher` extends this with the actions that need more machinery:
 * `animate`, the result-chaining host calls (`api`, `run_source`,
 * `call_binding`, `invoke_tool`) and the flow actions (`flow`, `branch`,
 * `confirm`, `validate`, `delay`, `invoke`). A host that only needs local
 * state and host events can use this class alone (see `headless/slim.ts`)
 * and leave the rest out of its bundle. Any other action warns and is skipped.
 *
 * @changes
 *   - 2026-09-27: created by splitting `event-dispatcher.ts`. The method
 *     bodies moved here unchanged; `EventDispatcher` behaves as before.
 */

import type {
	EventHandler,
	EventHandlerOrArray
} from '../schema/event-handler.js';
import type { StateStore } from './state-store.js';
import { resolveString, resolveValue, type ResolverContext } from './expression-resolver.js';
import type { RippleEvent, RippleEventResult } from '../types.js';
import { asText } from './text-coerce.js';

/**
 * Thrown when a step wants to stop the current flow early (e.g. `validate`
 * failed). Outer `flow` catches this to run `on_error`; the top-level
 * `dispatch` catches it to exit silently. Any other error type is a real
 * bug and is allowed to propagate.
 */
export class FlowAbortError extends Error {
	constructor(
		public reason: string,
		public context: Record<string, unknown> = {}
	) {
		super(reason);
		this.name = 'FlowAbortError';
	}
}

/**
 * Host callback invoked for the 6 externally-handled action types. Legacy
 * callers returning `void` continue to work unchanged — the dispatcher
 * treats that as a silent success: no error branch fires, no `response_key`
 * is populated (no data), but `on_success` continuations still run. Hosts
 * that want data-aware chaining return a `RippleEventResult`.
 */
export type OnEventCallback = (
	event: RippleEvent
) => void | Promise<RippleEventResult | void>;

export class BaseDispatcher {
	constructor(
		protected stateManager: StateStore,
		protected onEvent?: OnEventCallback
	) {}

	/**
	 * Entry point for UI code. Accepts a single handler or an array, dispatches
	 * sequentially, and swallows `FlowAbortError` so the rest of the UI keeps
	 * working even if a spec step asked to bail out.
	 */
	async dispatch(
		handler: EventHandlerOrArray,
		context: ResolverContext,
		eventValue?: unknown
	): Promise<void> {
		// Expose the event payload to expressions via the `{event}` template
		// (e.g. `value: '{event}'` on a handler). Done once at the top level so
		// nested flow/branch handlers also see it without manual threading.
		const ctx: ResolverContext = { ...context, event: eventValue };
		try {
			await this.runHandlers(handler, ctx, eventValue, 0);
		} catch (err) {
			if (err instanceof FlowAbortError) {
				return;
			}
			throw err;
		}
	}

	/** Internal: run a list or singleton of handlers, threading depth. */
	protected async runHandlers(
		handler: EventHandlerOrArray,
		context: ResolverContext,
		eventValue: unknown,
		depth: number
	): Promise<void> {
		const handlers = Array.isArray(handler) ? handler : [handler];
		for (const h of handlers) {
			await this.dispatchSingle(h, context, eventValue, depth);
		}
	}

	/** Internal: dispatch exactly one handler. Throws FlowAbortError on abort. */
	protected async dispatchSingle(
		handler: EventHandler,
		context: ResolverContext,
		eventValue: unknown,
		depth: number
	): Promise<void> {
		switch (handler.action) {
			case 'set':
				this.handleSet(handler, context, eventValue);
				return;
			case 'toggle':
				this.handleToggle(handler, context, eventValue);
				return;
			case 'push':
				this.handlePush(handler, context, eventValue);
				return;
			case 'remove':
				this.handleRemove(handler, context, eventValue);
				return;
			case 'open':
				this.handleOpen(handler);
				return;
			case 'navigate':
			case 'toast':
			case 'emit':
			case 'pin':
			case 'unpin':
				this.emitExternal(handler, context, eventValue);
				return;
			default:
				await this.dispatchOther(handler, context, eventValue, depth);
		}
	}

	/**
	 * Every action this class does not run itself. The base has none left, so
	 * it warns and does nothing; `EventDispatcher` overrides this with the
	 * host-call, animation and flow actions.
	 */
	protected async dispatchOther(
		handler: EventHandler,
		_context: ResolverContext,
		_eventValue: unknown,
		_depth: number
	): Promise<void> {
		const action = (handler as { action?: string }).action ?? '<missing>';
		console.warn(`BaseDispatcher: action "${action}" is not available in this runtime — skipped.`);
	}

	// -- primitive actions ---------------------------------------------------

	/**
	 * Resolve `{...}` placeholders in a target path. Lets specs do
	 * `target: 'issues.{i}.status'` to mutate the i-th item in a loop.
	 */
	protected resolveTarget(target: string, context: ResolverContext): string {
		if (!target.includes('{')) return target;
		const result = resolveString(target, context);
		return typeof result === 'string' ? result : asText(result);
	}

	protected handleSet(
		handler: Extract<EventHandler, { action: 'set' }>,
		context: ResolverContext,
		eventValue?: unknown
	): void {
		if (!handler.target) return;
		const target = this.resolveTarget(handler.target, context);
		let value = handler.value !== undefined ? handler.value : eventValue;
		// Resolve `{...}` expressions inside strings, arrays, and object values.
		value = resolveValue(value, context);
		this.stateManager.set(target, value);
	}

	protected handleOpen(handler: Extract<EventHandler, { action: 'open' }>): void {
		if (!handler.target) return;
		this.stateManager.set(handler.target, true);
	}

	/**
	 * `toggle` — semantics depend on the target's current type:
	 *  - boolean (or undefined): flip to !current
	 *  - array: toggle membership of `value` (add if absent, remove if present)
	 *  - other: warn and noop
	 */
	protected handleToggle(
		handler: Extract<EventHandler, { action: 'toggle' }>,
		context: ResolverContext,
		eventValue?: unknown
	): void {
		if (!handler.target) return;
		const target = this.resolveTarget(handler.target, context);

		let value = handler.value !== undefined ? handler.value : eventValue;
		value = resolveValue(value, context);

		const current = this.stateManager.get(target);

		if (Array.isArray(current)) {
			if (value === undefined) {
				console.warn(`EventDispatcher: toggle on array target "${target}" requires a value.`);
				return;
			}
			const idx = current.indexOf(value);
			const next = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, value];
			this.stateManager.set(target, next);
			return;
		}

		if (typeof current === 'boolean' || current === undefined || current === null) {
			this.stateManager.set(target, !current);
			return;
		}

		console.warn(
			`EventDispatcher: toggle on non-boolean / non-array target "${target}" (was ${typeof current}) — no-op.`
		);
	}

	/** `push` — append `value` to the array at `target`. Creates an array if missing. */
	protected handlePush(
		handler: Extract<EventHandler, { action: 'push' }>,
		context: ResolverContext,
		eventValue?: unknown
	): void {
		if (!handler.target) return;
		const target = this.resolveTarget(handler.target, context);

		let value = handler.value !== undefined ? handler.value : eventValue;
		value = resolveValue(value, context);
		if (value === undefined) return;

		const current = this.stateManager.get(target);
		if (current === undefined || current === null) {
			this.stateManager.set(target, [value]);
			return;
		}
		if (!Array.isArray(current)) {
			console.warn(
				`EventDispatcher: push on non-array target "${target}" (was ${typeof current}) — no-op.`
			);
			return;
		}
		this.stateManager.set(target, [...current, value]);
	}

	/** `remove` — remove an array item by `index` or by equality match on `value`. */
	protected handleRemove(
		handler: Extract<EventHandler, { action: 'remove' }>,
		context: ResolverContext,
		eventValue?: unknown
	): void {
		if (!handler.target) return;
		const target = this.resolveTarget(handler.target, context);

		const current = this.stateManager.get(target);
		if (!Array.isArray(current)) {
			console.warn(
				`EventDispatcher: remove on non-array target "${target}" (was ${typeof current}) — no-op.`
			);
			return;
		}

		if (typeof handler.index === 'number') {
			const next = current.filter((_, i) => i !== handler.index);
			this.stateManager.set(target, next);
			return;
		}

		let value = handler.value !== undefined ? handler.value : eventValue;
		value = resolveValue(value, context);
		if (value === undefined) return;

		// Primitive values: indexOf is fine. Objects: match by deep equality
		// (JSON-stringify compare) so `value: '{loopItem}'` works.
		let idx: number;
		if (typeof value === 'object' && value !== null) {
			const target_ = JSON.stringify(value);
			idx = current.findIndex((item) => {
				try { return JSON.stringify(item) === target_; } catch { return false; }
			});
		} else {
			idx = current.indexOf(value);
		}
		if (idx < 0) return;
		this.stateManager.set(target, current.filter((_, i) => i !== idx));
	}

	protected emitExternal(
		handler: Extract<
			EventHandler,
			{ action: 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin' }
		>,
		context: ResolverContext,
		eventValue?: unknown
	): void {
		if (!this.onEvent) return;

		const event: RippleEvent = {
			type: handler.action as RippleEvent['type']
		};

		if (handler.action === 'navigate') {
			// Defensive fallback: LLM-generated specs occasionally emit
			// `target` instead of `url` for navigate (cross-contamination
			// from the emit/pin/unpin shape). Accept either so the click
			// still works; the prompt teaches `url` going forward.
			const rawUrl = handler.url ?? (handler as { target?: string }).target;
			event.url = rawUrl ? (resolveString(rawUrl, context) as string) : '';
		}

		if (handler.action === 'toast') {
			event.message = resolveString(handler.message, context) as string;
			if (handler.variant) event.variant = handler.variant;
		}

		if (handler.action === 'emit') {
			let value = handler.value !== undefined ? handler.value : eventValue;
			// Resolve `{state.x}` placeholders anywhere in the payload — not just a
			// top-level string. A Chain Flow step emits `flow.next` with a value
			// like `{ formData: { workspace: '{state.workspace}' } }`, so the
			// nested expression must resolve before it reaches the host/runner.
			// resolveValue is a no-op for a plain (expression-free) value, so this
			// stays backward-compatible with existing string/object payloads.
			value = resolveValue(value, context);
			event.name = handler.target;
			if (handler.target) event.target = handler.target;
			event.payload = value;
		}

		if (handler.action === 'pin' || handler.action === 'unpin') {
			if (handler.target) event.target = handler.target;
			let value = handler.value !== undefined ? handler.value : eventValue;
			if (typeof value === 'string') value = resolveString(value, context);
			event.payload = value;
		}

		this.notifyHost(event);
	}

	// -- helpers ------------------------------------------------------------

	/**
	 * Fire-and-forget host emit for actions with no result chaining
	 * (navigate/toast/emit/pin/unpin, animate's observer echo, validate's
	 * abort toast). The host may return a promise; a rejection is logged via
	 * the dispatcher's soft-error path (console.warn, like every other
	 * dispatcher no-op) instead of becoming an unhandled rejection. Never
	 * awaited — these actions complete synchronously by contract, so caller
	 * behavior and event ordering are unchanged.
	 */
	protected notifyHost(event: RippleEvent): void {
		const maybe = this.onEvent?.(event);
		// instanceof (not truthiness): a JS consumer returning non-promise junk
		// must be ignored like before, not crash on .catch.
		if (maybe instanceof Promise) {
			maybe.catch((err: unknown) => {
				console.warn(`EventDispatcher: host onEvent for "${event.type}" rejected —`, err);
			});
		}
	}
}
