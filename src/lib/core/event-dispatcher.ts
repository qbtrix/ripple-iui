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
 *   - Added run_source action — host-delegated re-run of a server-side read
 *     binding, with the same async on_success / on_error chaining as `api`
 *   - Added call_binding action — host-delegated invocation of a server-side
 *     write binding; resolves {state.x}/{item.id} in path/params client-side
 *     before emitting, then chains on_success / on_error like run_source
 *     (RFC 05 M2a — Write actions core)
 *   - Added animate action — host-delegated imperative animation trigger;
 *     emits an `animate` RippleEvent carrying target + motion, like navigate
 *     (RFC 12 — animation primitive)
 *   - 2026-05-30 (PR #45 animate runtime): `animate` is now a REAL runtime
 *     behavior, not emit-only. `handleAnimate` locates the target node by widget
 *     id inside the dispatcher's DOM root (new optional `getAnimateRoot` ctor arg,
 *     supplied by Ripple.svelte) and pulses it via `playMotion`, so clicking an
 *     `animate` trigger moves the target on screen with NO host code. It still
 *     emits the `animate` event afterward so observers/hosts can react or override.
 *   - Added invoke_tool action — host-delegated invocation of a named
 *     server-side tool (WebFetch / Composio / etc.) by tool id + resolved
 *     args; click-driven sibling of run_source / call_binding for the new
 *     `POST /pockets/{id}/tools/run` wire (#1206 part a)
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
		private widgetRegistry?: WidgetRegistry,
		/**
		 * Returns the DOM subtree this dispatcher's `animate` action searches for
		 * its target node (by widget id). Supplied by Ripple.svelte as the rendered
		 * root. Optional — without it `animate` still emits its event for host
		 * observers, it just can't run the built-in pulse itself.
		 */
		private getAnimateRoot?: () => HTMLElement | null | undefined
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
			case 'animate':
				this.handleAnimate(handler, context, eventValue);
				return;
			case 'api':
				await this.handleApi(handler, context, depth);
				return;
			case 'run_source':
				await this.handleRunSource(handler, context, depth);
				return;
			case 'call_binding':
				await this.handleCallBinding(handler, context, depth);
				return;
			case 'invoke_tool':
				await this.handleInvokeTool(handler, context, depth);
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

	/**
	 * `animate` — host-delegated imperative animation trigger that ALSO runs a
	 * built-in pulse when a DOM root is available. Two halves:
	 *
	 *   1. RUNTIME (preferred path): locate the target node by its widget id in
	 *      the Ripple root and pulse it via `playMotion` (the same engine channels
	 *      the declarative `withMotion` action uses). This makes `animate` work
	 *      with NO host code — clicking the trigger moves the target on screen.
	 *   2. OBSERVERS: always emit an `animate` RippleEvent carrying the resolved
	 *      `target` + `motion`, exactly like `navigate`, so a host can observe /
	 *      override. Legacy hosts that only echoed the event keep working.
	 *
	 * The handler's `target` is a widget id; `motion` is a node-level Motion
	 * directive. `target` accepts `{...}` expressions (loop ids) like the other
	 * actions. Both were previously left `undefined` whenever a spec authored the
	 * action incorrectly — see the showcase fix in the same PR.
	 */
	private handleAnimate(
		handler: Extract<EventHandler, { action: 'animate' }>,
		context: ResolverContext,
		_eventValue?: unknown
	): void {
		const target = handler.target ? this.resolveTarget(handler.target, context) : handler.target;

		// 1. Runtime pulse — find the target node in the rendered root and play it.
		const root = this.getAnimateRoot?.();
		if (root && target && handler.motion) {
			// Escape the id for the attribute selector so ids with special chars
			// (or numeric loop ids) still match; fall back to getElementById.
			let node: HTMLElement | null = null;
			try {
				const sel =
					typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
						? `#${CSS.escape(target)}`
						: `#${target}`;
				node = root.querySelector<HTMLElement>(sel);
			} catch {
				node = null;
			}
			if (!node && typeof document !== 'undefined') {
				node = document.getElementById(target);
			}
			if (node) {
				// Lazy import keeps the dispatcher free of a static action dependency
				// (and the action free of any SSR/top-level engine import concern).
				void import('../actions/with-motion.js').then(({ playMotion }) => {
					playMotion(node!, handler.motion as never);
				});
			}
		}

		// 2. Observers — emit the event regardless, like navigate.
		if (this.onEvent) {
			const event: RippleEvent = { type: 'animate', target };
			(event as { motion?: unknown }).motion = handler.motion;
			this.onEvent(event);
		}
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

		const result = await this.callHost(event);

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

	/**
	 * `run_source` — host-delegated re-run of a server-side read binding.
	 * Ripple does not fetch; it emits a `run_source` event and lets the host
	 * re-run the named source. Result handling mirrors `handleApi` exactly:
	 * on success the host's data flows into `on_success`, on failure the error
	 * is written to `_flow_error` and `on_error` runs. A legacy `void` host
	 * return is treated as a silent success with no data.
	 */
	private async handleRunSource(
		handler: Extract<EventHandler, { action: 'run_source' }>,
		context: ResolverContext,
		depth: number
	): Promise<void> {
		if (!this.onEvent) return;

		const event: RippleEvent = {
			type: 'run_source',
			source: handler.source
		};

		const result = await this.callHost(event);

		if (result.ok) {
			if (handler.on_success && handler.on_success.length > 0) {
				await this.runHandlers(
					handler.on_success,
					this.freshContext(context),
					result.data,
					depth
				);
			}
		} else {
			this.stateManager.set(
				FLOW_ERROR_STATE_KEY,
				result.error ?? { message: 'run_source failed' }
			);
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

	/**
	 * `call_binding` — host-delegated invocation of a named server-side write
	 * binding (the write-action twin of `run_source`). Ripple does not make the
	 * HTTP call; it FIRST resolves `{state.x}` / `{item.id}` expressions in
	 * `path` and in each value of `params` client-side — exactly what
	 * `handleApi` does for `url` / `body` — then emits a `call_binding` event
	 * and lets the host perform the write. Result handling mirrors
	 * `handleRunSource` / `handleApi`: on success the host's data flows into
	 * `on_success`, on failure the error is written to `_flow_error` and
	 * `on_error` runs. A legacy `void` host return is a silent success.
	 *
	 * `method` is intentionally not part of the handler — the HTTP verb is read
	 * from the persisted spec on the server; the client never names the verb.
	 */
	private async handleCallBinding(
		handler: Extract<EventHandler, { action: 'call_binding' }>,
		context: ResolverContext,
		depth: number
	): Promise<void> {
		if (!this.onEvent) return;

		const event: RippleEvent = {
			type: 'call_binding',
			binding: handler.binding
		};

		// Resolve `{state.x}` / `{item.id}` in the path before the call leaves
		// the browser — identical to how `handleApi` resolves `url`.
		if (handler.path !== undefined) {
			event.path = resolveString(handler.path, context) as string;
		}

		// Resolve each param value the same way `handleApi` resolves `body` —
		// but via `resolveValue` so nested objects / arrays / non-string values
		// are handled too.
		if (handler.params) {
			const resolved: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(handler.params)) {
				resolved[key] = resolveValue(value, context);
			}
			event.params = resolved;
		}

		const result = await this.callHost(event);

		if (result.ok) {
			if (handler.on_success && handler.on_success.length > 0) {
				await this.runHandlers(
					handler.on_success,
					this.freshContext(context),
					result.data,
					depth
				);
			}
		} else {
			this.stateManager.set(
				FLOW_ERROR_STATE_KEY,
				result.error ?? { message: 'call_binding failed' }
			);
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

	/**
	 * `invoke_tool` — host-delegated invocation of a named server-side tool
	 * (WebFetch, Composio, etc.) by tool id + resolved args. Click-driven
	 * sibling of `run_source` / `call_binding`: ripple does not run the tool,
	 * it FIRST resolves `{state.x}` / `{item.id}` expressions in each value of
	 * `args` client-side (the same way `handleCallBinding` resolves `params`),
	 * then emits an `invoke_tool` event and lets the host POST to the new
	 * `/pockets/{id}/tools/run` wire. Result handling mirrors `handleCallBinding`
	 * / `handleRunSource`: on success the host's data flows into `on_success`,
	 * on failure the error is written to `_flow_error` and `on_error` runs. A
	 * legacy `void` host return is a silent success.
	 */
	private async handleInvokeTool(
		handler: Extract<EventHandler, { action: 'invoke_tool' }>,
		context: ResolverContext,
		depth: number
	): Promise<void> {
		if (!this.onEvent) return;

		const event: RippleEvent = {
			type: 'invoke_tool',
			tool: handler.tool
		};

		// Resolve each arg value before the call leaves the browser — identical
		// to how `handleCallBinding` resolves each `params` value. `resolveValue`
		// handles nested objects / arrays / non-string values so an arg like
		// `count: 5` or `filter: { open: true }` passes through unchanged while
		// `query: '{state.draft}'` resolves to the live state value.
		if (handler.args) {
			const resolved: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(handler.args)) {
				resolved[key] = resolveValue(value, context);
			}
			event.args = resolved;
		}

		const result = await this.callHost(event);

		if (result.ok) {
			if (handler.on_success && handler.on_success.length > 0) {
				await this.runHandlers(
					handler.on_success,
					this.freshContext(context),
					result.data,
					depth
				);
			}
		} else {
			this.stateManager.set(
				FLOW_ERROR_STATE_KEY,
				result.error ?? { message: 'invoke_tool failed' }
			);
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

	/**
	 * Emit an event to the host and normalize the reply into a RippleEventResult.
	 * Shared by `handleApi`, `handleRunSource`, `handleCallBinding`, and
	 * `handleInvokeTool`. Legacy hosts returning `void` are treated as a silent
	 * success with no data; a host that throws becomes a transport-level error
	 * result. Caller must have verified `this.onEvent`.
	 */
	private async callHost(event: RippleEvent): Promise<RippleEventResult> {
		try {
			const maybe = this.onEvent!(event);
			const raw = maybe && typeof (maybe as Promise<unknown>).then === 'function'
				? await (maybe as Promise<RippleEventResult | void>)
				: (maybe as RippleEventResult | void);

			// Legacy hosts returning `void` are treated as silent success.
			if (raw === undefined || raw === null) {
				return { ok: true, data: undefined };
			}
			return raw as RippleEventResult;
		} catch (err) {
			// A host throwing is a transport-level failure — surface it as an error result.
			return {
				ok: false,
				error: {
					message: err instanceof Error ? err.message : String(err)
				}
			};
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
	widgetRegistry?: WidgetRegistry,
	getAnimateRoot?: () => HTMLElement | null | undefined
): EventDispatcher {
	return new EventDispatcher(stateManager, onEvent, widgetRegistry, getAnimateRoot);
}
