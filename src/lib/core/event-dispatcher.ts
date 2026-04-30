/**
 * @file event-dispatcher.ts
 * @description Runs event handlers against a StateManager, emits host events,
 * and chains multi-step flows (flow / branch / confirm / validate / delay /
 * invoke) plus async continuations on `api` actions.
 * @changes
 *   - Initial 8-action dispatcher (set/open/api/navigate/toast/emit/pin/unpin)
 *   - Converted to a discriminated-union-aware dispatcher with narrowing
 *   - Added flow actions (flow, branch, confirm, validate, delay, invoke)
 *   - Added async api chaining via RippleEventResult on the OnEventCallback
 *   - FlowAbortError for `validate` failures + flow-level error recovery
 *   - Enforces max nested flow depth to stop run-away recursion
 *   - Wires the new per-instance WidgetRegistry through the constructor
 */

import type {
	EventHandler,
	EventHandlerOrArray
} from '../schema/event-handler.js';
import type { StateManager } from './state-manager.svelte.js';
import {
	resolveString,
	resolveValue,
	evaluateCondition,
	type ResolverContext
} from './expression-resolver.js';
import type { RippleEvent, RippleEventResult } from '../types.js';
import type { WidgetRegistry } from './widget-registry.js';

/** Maximum nested `flow` depth. Guards against run-away specs. */
export const MAX_FLOW_DEPTH = 8;

/** State key that `confirm` writes its pending request into. */
export const CONFIRM_STATE_KEY = '_ripple_confirm';

/** State key that stores the last `api`/flow error for `on_error` consumers. */
export const FLOW_ERROR_STATE_KEY = '_flow_error';

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

/** Pending confirmation resolver — written when `confirm` suspends. */
type ConfirmResolver = (decision: 'confirm' | 'cancel') => void;

/** Public shape of the reserved `_ripple_confirm` state key. */
export interface PendingConfirm {
	pending_id: string;
	title?: string;
	message: string;
	confirm_label: string;
	cancel_label: string;
}

function uuid(): string {
	// crypto.randomUUID is widely available in modern browsers and node 19+.
	// Fall back to a timestamp + random suffix for older environments.
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `ripple-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export class EventDispatcher {
	/** Internal map of pending confirms. Resolver is cleared once decision arrives. */
	private confirmRegistry = new Map<string, ConfirmResolver>();

	constructor(
		private stateManager: StateManager,
		private onEvent?: OnEventCallback,
		private widgetRegistry?: WidgetRegistry
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
		try {
			await this.runHandlers(handler, context, eventValue, 0);
		} catch (err) {
			if (err instanceof FlowAbortError) {
				// Expected control-flow signal. Swallow at the top level.
				return;
			}
			throw err;
		}
	}

	/**
	 * Resolve a pending `confirm` request. Called by the ConfirmDialog widget
	 * once the user has clicked a button.
	 */
	resolveConfirm(pendingId: string, decision: 'confirm' | 'cancel'): boolean {
		const resolver = this.confirmRegistry.get(pendingId);
		if (!resolver) return false;
		this.confirmRegistry.delete(pendingId);
		resolver(decision);
		return true;
	}

	/** Current pending confirm id (test hook). */
	hasPendingConfirm(pendingId: string): boolean {
		return this.confirmRegistry.has(pendingId);
	}

	/** Internal: run a list or singleton of handlers, threading depth. */
	private async runHandlers(
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
	private async dispatchSingle(
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
			case 'api':
				await this.handleApi(handler, context, depth);
				return;
			case 'flow':
				await this.handleFlow(handler, context, depth, eventValue);
				return;
			case 'branch':
				await this.handleBranch(handler, context, depth, eventValue);
				return;
			case 'confirm':
				await this.handleConfirm(handler, context, depth);
				return;
			case 'validate':
				this.handleValidate(handler, context);
				return;
			case 'delay':
				await sleep(handler.ms);
				return;
			case 'invoke':
				await this.handleInvoke(handler, context);
				return;
			default: {
				// TypeScript exhaustiveness check. At runtime, unknown actions warn.
				const unknownAction = (handler as { action?: string }).action ?? '<missing>';
				console.warn(`EventDispatcher: Unknown action "${unknownAction}"`);
			}
		}
	}

	// -- primitive actions ---------------------------------------------------

	/**
	 * Resolve `{...}` placeholders in a target path. Lets specs do
	 * `target: 'issues.{i}.status'` to mutate the i-th item in a loop.
	 */
	private resolveTarget(target: string, context: ResolverContext): string {
		if (!target.includes('{')) return target;
		const result = resolveString(target, context);
		return typeof result === 'string' ? result : String(result ?? '');
	}

	private handleSet(
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

	private handleOpen(handler: Extract<EventHandler, { action: 'open' }>): void {
		if (!handler.target) return;
		this.stateManager.set(handler.target, true);
	}

	/**
	 * `toggle` — semantics depend on the target's current type:
	 *  - boolean (or undefined): flip to !current
	 *  - array: toggle membership of `value` (add if absent, remove if present)
	 *  - other: warn and noop
	 */
	private handleToggle(
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
	private handlePush(
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
	private handleRemove(
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

	private emitExternal(
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
			event.url = resolveString(handler.url, context) as string;
		}

		if (handler.action === 'toast') {
			event.message = resolveString(handler.message, context) as string;
			if (handler.variant) event.variant = handler.variant;
		}

		if (handler.action === 'emit') {
			let value = handler.value !== undefined ? handler.value : eventValue;
			if (typeof value === 'string') value = resolveString(value, context);
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

		this.onEvent(event);
	}

	// -- api with async continuations ---------------------------------------

	private async handleApi(
		handler: Extract<EventHandler, { action: 'api' }>,
		context: ResolverContext,
		depth: number
	): Promise<void> {
		if (!this.onEvent) return;

		const event: RippleEvent = {
			type: 'api',
			url: resolveString(handler.url, context) as string
		};
		if (handler.method) event.method = handler.method;
		if (handler.headers) event.headers = handler.headers;
		if (handler.body) {
			const resolved: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(handler.body)) {
				resolved[key] = typeof value === 'string' ? resolveString(value, context) : value;
			}
			event.body = resolved;
		}

		let result: RippleEventResult;
		try {
			const maybe = this.onEvent(event);
			const raw = maybe && typeof (maybe as Promise<unknown>).then === 'function'
				? await (maybe as Promise<RippleEventResult | void>)
				: (maybe as RippleEventResult | void);

			// Legacy hosts returning `void` are treated as silent success.
			if (raw === undefined || raw === null) {
				result = { ok: true, data: undefined };
			} else {
				result = raw as RippleEventResult;
			}
		} catch (err) {
			// A host throwing is a transport-level failure — surface it as an error result.
			result = {
				ok: false,
				error: {
					message: err instanceof Error ? err.message : String(err)
				}
			};
		}

		if (result.ok) {
			if (handler.response_key && result.data !== undefined) {
				this.stateManager.set(handler.response_key, result.data);
			}
			if (handler.on_success && handler.on_success.length > 0) {
				await this.runHandlers(
					handler.on_success,
					this.freshContext(context),
					result.data,
					depth
				);
			}
		} else {
			this.stateManager.set(FLOW_ERROR_STATE_KEY, result.error ?? { message: 'api failed' });
			if (handler.on_error && handler.on_error.length > 0) {
				await this.runHandlers(
					handler.on_error,
					this.freshContext(context),
					result.error,
					depth
				);
			}
		}
	}

	// -- composite flow actions ---------------------------------------------

	private async handleFlow(
		handler: Extract<EventHandler, { action: 'flow' }>,
		context: ResolverContext,
		depth: number,
		eventValue?: unknown
	): Promise<void> {
		const nextDepth = depth + 1;
		if (nextDepth > MAX_FLOW_DEPTH) {
			throw new Error(
				`EventDispatcher: flow nesting depth exceeded MAX_FLOW_DEPTH=${MAX_FLOW_DEPTH}`
			);
		}

		try {
			for (const step of handler.steps) {
				await this.dispatchSingle(step, context, eventValue, nextDepth);
			}
		} catch (err) {
			if (err instanceof FlowAbortError) {
				// Persist the abort reason so `on_error` can inspect it.
				// We keep a separate `details` object so the human-readable
				// `message` (from e.g. a validate failure) doesn't clobber
				// the machine-readable `reason` code.
				this.stateManager.set(FLOW_ERROR_STATE_KEY, {
					message: err.reason,
					details: err.context
				});
				if (handler.on_error && handler.on_error.length > 0) {
					await this.runHandlers(
						handler.on_error,
						this.freshContext(context),
						err,
						nextDepth
					);
				}
				return; // swallow — flow handled its own abort
			}
			throw err;
		}
	}

	private async handleBranch(
		handler: Extract<EventHandler, { action: 'branch' }>,
		context: ResolverContext,
		depth: number,
		eventValue?: unknown
	): Promise<void> {
		const condition = evaluateCondition(handler.if, this.freshContext(context));
		const branch = condition ? handler.then : handler.else;
		if (!branch || branch.length === 0) return;
		await this.runHandlers(branch, this.freshContext(context), eventValue, depth);
	}

	private async handleConfirm(
		handler: Extract<EventHandler, { action: 'confirm' }>,
		context: ResolverContext,
		depth: number
	): Promise<void> {
		const pendingId = uuid();
		const pending: PendingConfirm = {
			pending_id: pendingId,
			title: handler.title ? (resolveString(handler.title, context) as string) : undefined,
			message: resolveString(handler.message, context) as string,
			confirm_label: handler.confirm_label ?? 'Confirm',
			cancel_label: handler.cancel_label ?? 'Cancel'
		};

		const decision = await new Promise<'confirm' | 'cancel'>((resolve) => {
			this.confirmRegistry.set(pendingId, resolve);
			this.stateManager.set(CONFIRM_STATE_KEY, pending);
		});

		const branch = decision === 'confirm' ? handler.on_confirm : handler.on_cancel;
		try {
			if (branch && branch.length > 0) {
				await this.runHandlers(branch, this.freshContext(context), undefined, depth);
			}
		} finally {
			// Always clear the pending record — even if the follow-up handlers
			// threw — so the ConfirmDialog unmounts and the UI doesn't wedge.
			this.stateManager.set(CONFIRM_STATE_KEY, null);
		}
	}

	private handleValidate(
		handler: Extract<EventHandler, { action: 'validate' }>,
		context: ResolverContext
	): void {
		const ok = evaluateCondition(handler.condition, context);
		if (ok) return;

		const message = resolveString(handler.message, context) as string;
		if (this.onEvent) {
			this.onEvent({
				type: 'toast',
				message,
				variant: handler.variant ?? 'error'
			});
		}
		throw new FlowAbortError('validation_failed', { message });
	}

	private async handleInvoke(
		handler: Extract<EventHandler, { action: 'invoke' }>,
		context: ResolverContext
	): Promise<void> {
		if (!this.widgetRegistry) {
			console.warn('EventDispatcher: invoke requires a WidgetRegistry — did you forget to pass one?');
			return;
		}
		if (!this.widgetRegistry.has(handler.target, handler.method)) {
			console.warn(
				`EventDispatcher: invoke target "${handler.target}.${handler.method}" is not registered — skipping.`
			);
			return;
		}
		// Resolve any string args that contain expressions.
		const args = (handler.args ?? []).map((arg) =>
			typeof arg === 'string' ? resolveString(arg, context) : arg
		);
		const result = this.widgetRegistry.invoke(handler.target, handler.method, args);
		if (result && typeof (result as Promise<unknown>).then === 'function') {
			await result;
		}
	}

	// -- helpers ------------------------------------------------------------

	/**
	 * Return a new ResolverContext snapshot — continuations always read the
	 * current state, even after prior steps mutated it.
	 */
	private freshContext(context: ResolverContext): ResolverContext {
		return {
			...context,
			state: this.stateManager.state
		};
	}
}

export function createEventDispatcher(
	stateManager: StateManager,
	onEvent?: OnEventCallback,
	widgetRegistry?: WidgetRegistry
): EventDispatcher {
	return new EventDispatcher(stateManager, onEvent, widgetRegistry);
}
