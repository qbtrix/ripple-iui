/**
 * @file slim.ts
 * @description Public entry for `@ripple-ui/core/headless/slim` — the
 * headless runtime with a smaller dispatcher, for hosts that bundle Ripple
 * into a size-constrained page.
 *
 * `SlimHeadless` resolves specs exactly like `RippleHeadless` (same
 * expressions, `show`, `if`, `each`, bindings and loop variables) and runs the
 * actions `BaseDispatcher` handles:
 *
 *   - local state: `set`, `toggle`, `push`, `remove`, `open`
 *   - host events: `navigate`, `toast`, `emit`, `pin`, `unpin`, passed to
 *     `onEvent` in the same shape the full runtime sends
 *
 * Everything else (`animate`, `api`, `run_source`, `call_binding`,
 * `invoke_tool`, `flow`, `branch`, `confirm`, `validate`, `delay`, `invoke`)
 * logs a warning and is skipped. Use `@ripple-ui/core/headless` when a spec
 * needs those.
 *
 * Nothing reachable from here imports `event-dispatcher.ts` or the zod
 * schema; `slim.imports.test.ts` enforces that.
 *
 * @changes
 *   - 2026-09-27: created.
 */

import { BaseDispatcher } from '../core/base-dispatcher.js';
import { HeadlessRuntimeBase, type HeadlessRuntimeOptions } from './runtime-base.js';

/** The headless runtime with local state actions and host events only. */
export class SlimHeadless extends HeadlessRuntimeBase<BaseDispatcher> {
	constructor(options: HeadlessRuntimeOptions) {
		super(options, (state, onEvent) => new BaseDispatcher(state, onEvent));
	}
}

export function createSlimHeadlessRuntime(options: HeadlessRuntimeOptions): SlimHeadless {
	return new SlimHeadless(options);
}

export { HeadlessRuntimeBase, type HeadlessRuntimeOptions, type DispatcherFactory } from './runtime-base.js';
export { BaseDispatcher, FlowAbortError, type OnEventCallback } from '../core/base-dispatcher.js';
export { resolveTree } from './resolve-tree.js';
export { HeadlessStateManager, createHeadlessStateManager } from './state.js';
export type { ResolvedNode, ResolvedTree, ResolveContext } from './types.js';
export type { StateStore, StateSubscriber } from '../core/state-store.js';
export type { UINode, UISpec } from '../schema/ui-spec.js';
export type { EventHandler, EventHandlerOrArray } from '../schema/event-handler.js';
