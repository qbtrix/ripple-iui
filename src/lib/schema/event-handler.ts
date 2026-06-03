/**
 * @file event-handler.ts
 * @description Defines event handler types for widget interactions.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with set, api, navigate, toast, emit, and open actions
 *   - Converted to discriminatedUnion on `action` so each variant has its own shape
 *   - Added flow, branch, confirm, validate, delay, invoke action types
 *   - Extended api action with response_key, on_success, on_error for async chaining
 *   - Added run_source action — host-delegated re-run of a server-side read
 *     binding (RFC 04 — Pocket Interactivity & Data Sync)
 *   - Added call_binding action — host-delegated write-action twin of
 *     run_source; invokes a named server-side write binding (RFC 05 M2a)
 *   - Added animate action — host-delegated imperative animation trigger on a
 *     target node by id, carrying a node-level Motion directive (RFC 12)
 *   - Added invoke_tool action — host-delegated invocation of a named
 *     server-side tool (WebFetch / Composio / etc.) by tool id + resolved
 *     args; the click-driven sibling of run_source / call_binding for
 *     home-pocket button refresh (#1206 part a)
 *   - EventHandlerOrArray still accepts either a single handler or an array for
 *     backwards compatibility with existing specs
 */

import { z } from 'zod';
import { Motion } from './motion.js';

/**
 * Supported event handler actions.
 *
 * Legacy actions:
 * - set: Update a state value
 * - api: Make an API call (host-delegated — host performs the HTTP request)
 * - run_source: Re-run a server-side read binding (host-delegated — host
 *   re-fetches the named source)
 * - call_binding: Invoke a named server-side write binding (host-delegated —
 *   host performs the write; the verb lives in the persisted spec)
 * - invoke_tool: Invoke a named server-side tool by id with resolved args
 *   (host-delegated — the host POSTs to `/pockets/{id}/tools/run` with the
 *   tool name + args; click-driven sibling of run_source / call_binding)
 * - navigate: Navigate to a URL
 * - toast: Show a toast notification
 * - emit: Emit a custom event to parent
 * - open: Open a modal/dialog (writes `true` to state path)
 * - pin / unpin: Host-delegated add/remove operations
 *
 * Flow actions (phase B):
 * - flow: Sequential execution of steps with optional on_error fallback
 * - branch: Conditional execution of a then / else sub-flow
 * - confirm: Show a confirmation dialog and branch on decision
 * - validate: Assert a condition, toast + abort on failure
 * - delay: Pause for the given number of milliseconds
 * - invoke: Call a registered widget method by id
 */
export const EventAction = z.enum([
	'set',
	'toggle',
	'push',
	'remove',
	'api',
	'run_source',
	'call_binding',
	'invoke_tool',
	'navigate',
	'toast',
	'emit',
	'open',
	'pin',
	'unpin',
	'flow',
	'branch',
	'confirm',
	'validate',
	'delay',
	'invoke',
	'animate'
]);

export type EventAction = z.infer<typeof EventAction>;

/** Toast severity variants reused across toast and validate actions. */
const ToastVariant = z.enum(['default', 'success', 'error', 'warning', 'info']);

/** `set` — assign a value to a state path. */
export const SetHandler = z.object({
	action: z.literal('set'),
	target: z.string(),
	value: z.any().optional()
});

/**
 * `toggle` — flip a boolean target, or toggle membership of `value` in an array
 * target. With no `value`, the target must be a boolean and is inverted.
 */
export const ToggleHandler = z.object({
	action: z.literal('toggle'),
	target: z.string(),
	value: z.any().optional()
});

/**
 * `push` — append a value to an array target. If the target is undefined,
 * a new array is created. No-op on non-array targets (with a warning).
 */
export const PushHandler = z.object({
	action: z.literal('push'),
	target: z.string(),
	value: z.any().optional()
});

/**
 * `remove` — remove an item from an array target. With `value`, removes by
 * equality match (first occurrence). With `index`, removes by position.
 */
export const RemoveHandler = z.object({
	action: z.literal('remove'),
	target: z.string(),
	value: z.any().optional(),
	index: z.number().optional()
});

/** `open` — set the target state path to true (opens modals and dialogs). */
export const OpenHandler = z.object({
	action: z.literal('open'),
	target: z.string()
});

/** `navigate` — host-delegated URL change. */
export const NavigateHandler = z.object({
	action: z.literal('navigate'),
	url: z.string()
});

/** `toast` — host-delegated toast notification. */
export const ToastHandler = z.object({
	action: z.literal('toast'),
	message: z.string(),
	variant: ToastVariant.optional()
});

/** `emit` — host-delegated custom event. */
export const EmitHandler = z.object({
	action: z.literal('emit'),
	target: z.string().optional(),
	value: z.any().optional()
});

/** `pin` / `unpin` — host-delegated bookmark-style operations. */
export const PinHandler = z.object({
	action: z.literal('pin'),
	target: z.string().optional(),
	value: z.any().optional()
});

export const UnpinHandler = z.object({
	action: z.literal('unpin'),
	target: z.string().optional(),
	value: z.any().optional()
});

/**
 * `api` — host-delegated HTTP call. The dispatcher emits the event to the
 * host's `onEvent` callback; the host performs the actual request and returns
 * a RippleEventResult. The dispatcher then chains on_success / on_error and
 * writes the response into `response_key` if given.
 *
 * For backwards compatibility, hosts returning `void` are treated as a
 * silent success with no response body — no continuation fires.
 */
export const ApiHandler: z.ZodType<ApiHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('api'),
		url: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
		body: z.record(z.string(), z.any()).optional(),
		headers: z.record(z.string(), z.string()).optional(),
		response_key: z.string().optional(),
		on_success: z.array(EventHandler).optional(),
		on_error: z.array(EventHandler).optional()
	})
);

/**
 * `run_source` — host-delegated re-run of a server-side read binding ("source").
 * Ripple does not fetch; it emits the event to the host's `onEvent` callback,
 * the host re-runs the named source and returns a RippleEventResult. The
 * dispatcher then chains on_success / on_error exactly like `api`.
 *
 * For backwards compatibility, hosts returning `void` are treated as a silent
 * success with no data — no continuation receives a payload.
 */
export const RunSourceHandler: z.ZodType<RunSourceHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('run_source'),
		source: z.string(),
		on_success: z.array(EventHandler).optional(),
		on_error: z.array(EventHandler).optional()
	})
);

/**
 * `call_binding` — host-delegated invocation of a named server-side write
 * binding. The write-action twin of `run_source`: ripple does not make the
 * HTTP call, it emits a `call_binding` event to the host's `onEvent` callback,
 * the host performs the write and returns a RippleEventResult. The dispatcher
 * resolves `{state.x}` / `{item.id}` in `path` and `params` client-side before
 * the event leaves the browser (exactly like `api` resolves `url` / `body`),
 * then chains on_success / on_error exactly like `run_source` and `api`.
 *
 * NOTE: `method` is deliberately absent — the HTTP verb is read from the
 * persisted spec on the server; the client never names the verb.
 *
 * For backwards compatibility, hosts returning `void` are treated as a silent
 * success with no data — no continuation receives a payload.
 */
export const CallBindingHandler: z.ZodType<CallBindingHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('call_binding'),
		binding: z.string(),
		path: z.string().optional(),
		params: z.record(z.string(), z.any()).optional(),
		on_success: z.array(EventHandler).optional(),
		on_error: z.array(EventHandler).optional()
	})
);

/**
 * `invoke_tool` — host-delegated invocation of a named server-side tool
 * (WebFetch, Composio, etc.) by tool id + resolved args. The click-driven
 * sibling of `run_source` (read-only fetch) and `call_binding` (named
 * write binding); the home grid's `onEvent` plumbing POSTs to
 * `/pockets/{id}/tools/run` and the dispatcher chains `on_success` /
 * `on_error` with the result exactly like `run_source` / `call_binding`.
 *
 * The dispatcher resolves `{state.x}` / `{item.id}` inside each value of
 * `args` client-side before emitting (same contract as `call_binding`
 * resolves `path` / `params`), so the server never sees expressions.
 *
 * For backwards compatibility, hosts returning `void` are treated as a
 * silent success with no data — no continuation receives a payload.
 */
export const InvokeToolHandler: z.ZodType<InvokeToolHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('invoke_tool'),
		tool: z.string(),
		args: z.record(z.string(), z.any()).optional(),
		on_success: z.array(EventHandler).optional(),
		on_error: z.array(EventHandler).optional()
	})
);

/** `flow` — run a list of steps sequentially. `on_error` fires on FlowAbortError. */
export const FlowHandler: z.ZodType<FlowHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('flow'),
		steps: z.array(EventHandler),
		on_error: z.array(EventHandler).optional()
	})
);

/** `branch` — evaluate `if` and run the matching sub-flow. */
export const BranchHandler: z.ZodType<BranchHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('branch'),
		if: z.string(),
		then: z.array(EventHandler),
		else: z.array(EventHandler).optional()
	})
);

/** `confirm` — render the ConfirmDialog, suspend, then run on_confirm / on_cancel. */
export const ConfirmHandler: z.ZodType<ConfirmHandlerType> = z.lazy(() =>
	z.object({
		action: z.literal('confirm'),
		title: z.string().optional(),
		message: z.string(),
		confirm_label: z.string().optional(),
		cancel_label: z.string().optional(),
		on_confirm: z.array(EventHandler),
		on_cancel: z.array(EventHandler).optional()
	})
);

/** `validate` — if condition is falsy, toast + abort. Silent on pass. */
export const ValidateHandler = z.object({
	action: z.literal('validate'),
	condition: z.string(),
	message: z.string(),
	variant: ToastVariant.optional()
});

/** `delay` — pause for the given number of milliseconds. */
export const DelayHandler = z.object({
	action: z.literal('delay'),
	ms: z.number().nonnegative()
});

/** `invoke` — call a registered widget method by widget id. */
export const InvokeHandler = z.object({
	action: z.literal('invoke'),
	target: z.string(),
	method: z.string(),
	args: z.array(z.any()).optional()
});

/** `animate` — host-delegated imperative animation trigger on a target node. */
export const AnimateHandler = z.object({
	action: z.literal('animate'),
	target: z.string(),
	motion: Motion
});

// Forward-declared concrete types for recursive schemas (flow/branch/confirm/api).
type ApiHandlerType = {
	action: 'api';
	url: string;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	body?: Record<string, unknown>;
	headers?: Record<string, string>;
	response_key?: string;
	on_success?: EventHandler[];
	on_error?: EventHandler[];
};

type RunSourceHandlerType = {
	action: 'run_source';
	source: string;
	on_success?: EventHandler[];
	on_error?: EventHandler[];
};

type CallBindingHandlerType = {
	action: 'call_binding';
	binding: string;
	path?: string;
	params?: Record<string, unknown>;
	on_success?: EventHandler[];
	on_error?: EventHandler[];
};

type InvokeToolHandlerType = {
	action: 'invoke_tool';
	tool: string;
	args?: Record<string, unknown>;
	on_success?: EventHandler[];
	on_error?: EventHandler[];
};

type FlowHandlerType = {
	action: 'flow';
	steps: EventHandler[];
	on_error?: EventHandler[];
};

type BranchHandlerType = {
	action: 'branch';
	if: string;
	then: EventHandler[];
	else?: EventHandler[];
};

type ConfirmHandlerType = {
	action: 'confirm';
	title?: string;
	message: string;
	confirm_label?: string;
	cancel_label?: string;
	on_confirm: EventHandler[];
	on_cancel?: EventHandler[];
};

/**
 * Event handler specification — a union discriminated on `action`.
 *
 * NOTE: We use `z.union(...)` rather than `z.discriminatedUnion(...)` here
 * because a few variants (api, flow, branch, confirm) are recursive —
 * `z.discriminatedUnion` does not accept `z.lazy` members in Zod v4, so we
 * fall back to `z.union`. Validation performance is comparable for this
 * small number of variants; narrowing on the `action` literal still works
 * at the TypeScript level thanks to the explicit union of `EventHandler`.
 */
export const EventHandler = z.union([
	SetHandler,
	ToggleHandler,
	PushHandler,
	RemoveHandler,
	OpenHandler,
	NavigateHandler,
	ToastHandler,
	EmitHandler,
	PinHandler,
	UnpinHandler,
	ApiHandler,
	RunSourceHandler,
	CallBindingHandler,
	InvokeToolHandler,
	FlowHandler,
	BranchHandler,
	ConfirmHandler,
	ValidateHandler,
	DelayHandler,
	InvokeHandler,
	AnimateHandler
]);

export type EventHandler =
	| z.infer<typeof SetHandler>
	| z.infer<typeof ToggleHandler>
	| z.infer<typeof PushHandler>
	| z.infer<typeof RemoveHandler>
	| z.infer<typeof OpenHandler>
	| z.infer<typeof NavigateHandler>
	| z.infer<typeof ToastHandler>
	| z.infer<typeof EmitHandler>
	| z.infer<typeof PinHandler>
	| z.infer<typeof UnpinHandler>
	| ApiHandlerType
	| RunSourceHandlerType
	| CallBindingHandlerType
	| InvokeToolHandlerType
	| FlowHandlerType
	| BranchHandlerType
	| ConfirmHandlerType
	| z.infer<typeof ValidateHandler>
	| z.infer<typeof DelayHandler>
	| z.infer<typeof InvokeHandler>
	| z.infer<typeof AnimateHandler>;

/**
 * Multiple event handlers can be chained.
 * Example: On click, set state AND show toast.
 */
export const EventHandlerOrArray = z.union([EventHandler, z.array(EventHandler)]);

export type EventHandlerOrArray = EventHandler | EventHandler[];
