/**
 * @file index.ts
 * @description Public entry for `@ripple-ui/svelte/headless` — Ripple's
 * spec engine with no renderer attached.
 *
 * Nothing reachable from this file imports Svelte, `.svelte` files, or
 * touches `document` / `window`, which is what lets it run in bare Node,
 * a Worker, a test, or a non-Svelte framework. `headless-purity.test.ts`
 * enforces that as a build gate rather than a convention.
 *
 * What you get:
 *   - `createHeadlessRuntime` — state + dispatcher + resolved tree.
 *   - `resolveTree`           — the pure function, if you want no runtime.
 *   - `HeadlessStateManager`  — the rune-free `StateStore`.
 *
 * What you do NOT get: widgets. A resolved tree names widget types; how
 * they draw is the renderer's business. `@ripple-ui/svelte` remains the
 * Svelte renderer for that same engine.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

export {
	RippleHeadless,
	createHeadlessRuntime,
	type HeadlessRuntimeOptions
} from './runtime.js';

export { resolveTree } from './resolve-tree.js';

export {
	HeadlessStateManager,
	createHeadlessStateManager
} from './state.js';

export type {
	ResolvedNode,
	ResolvedTree,
	ResolveContext
} from './types.js';

// The engine pieces the headless runtime is built from, re-exported so a
// consumer needs exactly one import path.
export type { StateStore, StateSubscriber } from '../core/state-store.js';
export {
	EventDispatcher,
	createEventDispatcher,
	FlowAbortError,
	MAX_FLOW_DEPTH,
	CONFIRM_STATE_KEY,
	FLOW_ERROR_STATE_KEY,
	type OnEventCallback,
	type PendingConfirm
} from '../core/event-dispatcher.js';
export {
	evaluateExpression,
	resolveString,
	resolveObject,
	resolveValue,
	evaluateCondition,
	hasExpressions,
	withFlowContext,
	type ResolverContext
} from '../core/expression-resolver.js';
export { normalizeSpec } from '../core/normalizer.js';
export { getBindContract, DEFAULT_BIND_CONTRACT } from '../core/widget-bind-contract.js';
export type { UINode, UISpec } from '../schema/ui-spec.js';
export type { EventHandler, EventHandlerOrArray } from '../schema/event-handler.js';
