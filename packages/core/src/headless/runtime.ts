/**
 * @file runtime.ts
 * @description `RippleHeadless` — the framework-free counterpart to
 * `Ripple.svelte`.
 *
 * Ripple.svelte does four things: normalize the spec, construct the
 * state manager and dispatcher, publish them on Svelte context, and
 * render. This class does the first two, exposes them directly instead
 * of via context, and hands you a resolved tree instead of DOM.
 *
 * ```ts
 * const rt = createHeadlessRuntime({ spec, state: { count: 0 } });
 * rt.tree.nodes;                      // resolved, expressions evaluated
 * await rt.dispatch(node, 'onclick'); // runs the spec's handler
 * rt.tree.nodes;                      // re-resolved against new state
 * ```
 *
 * Reactivity is pull-based by design. The Svelte runtime re-renders
 * through `$derived`; here, the tree is recomputed lazily on the next
 * `tree` read after state changes, and `subscribe()` notifies observers
 * so a host framework can drive its own render loop. That keeps the
 * runtime honest about being framework-free: it never assumes anyone is
 * watching.
 *
 * The dispatcher is the SAME class the Svelte path uses. Actions that
 * need a host (`api`, `navigate`, `emit`, `call_binding`, `invoke_tool`,
 * ...) go to the `onEvent` callback exactly as they do in the browser,
 * so a headless host and a Svelte host implement one interface. The one
 * action that genuinely needs a DOM — `animate` — degrades to emit-only,
 * because no `getAnimateRoot` is supplied.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 *   - 2026-09-27: `dispatch` resolves handlers with the node's loop variables,
 *     so an action inside `each` reads its own row. It used to see state and
 *     data only, and `{item.id}` resolved to nothing.
 *   - 2026-09-27: the body moved to runtime-base.ts unchanged. `RippleHeadless`
 *     is now that base with the full `EventDispatcher`; `SlimHeadless`
 *     (slim.ts) is the same base with `BaseDispatcher` only.
 */

import { EventDispatcher } from '../core/event-dispatcher.js';
import { HeadlessRuntimeBase, type HeadlessRuntimeOptions } from './runtime-base.js';

export type { HeadlessRuntimeOptions } from './runtime-base.js';

/** The headless runtime with every action the Svelte renderer supports. */
export class RippleHeadless extends HeadlessRuntimeBase<EventDispatcher> {
	constructor(options: HeadlessRuntimeOptions) {
		super(options, (state, onEvent) => new EventDispatcher(state, onEvent));
	}
}

export function createHeadlessRuntime(options: HeadlessRuntimeOptions): RippleHeadless {
	return new RippleHeadless(options);
}
