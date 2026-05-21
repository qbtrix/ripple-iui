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
 *   - EventHandlerOrArray still accepts either a single handler or an array for
 *     backwards compatibility with existing specs
 */

import { z } from 'zod';

/**
 * Supported event handler actions.
 *
 * Legacy actions:
 * - set: Update a state value
 * - api: Make an API call (host-delegated — host performs the HTTP request)
 * - run_source: Re-run a server-side read binding (host-delegated — host
 *   re-fetches the named source)
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
	'invoke'
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
	FlowHandler,
	BranchHandler,
	ConfirmHandler,
	ValidateHandler,
	DelayHandler,
	InvokeHandler
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
	| FlowHandlerType
	| BranchHandlerType
	| ConfirmHandlerType
	| z.infer<typeof ValidateHandler>
	| z.infer<typeof DelayHandler>
	| z.infer<typeof InvokeHandler>;

/**
 * Multiple event handlers can be chained.
 * Example: On click, set state AND show toast.
 */
export const EventHandlerOrArray = z.union([EventHandler, z.array(EventHandler)]);

export type EventHandlerOrArray = EventHandler | EventHandler[];
