/**
 * @file types.ts
 * @description Output shapes for the headless runtime.
 *
 * `resolveTree` walks a `UISpec` and returns `ResolvedNode`s: the same
 * tree with every expression already evaluated, `show`/`if` already
 * decided, and `each` already expanded into concrete children. Nothing
 * in here references Svelte or the DOM — a consumer can render it with
 * React, serialize it to JSON, diff two of them, or assert on it in a
 * test.
 *
 * The invariant that makes this useful: a ResolvedNode tree contains no
 * unevaluated `{state.x}` templates and no control-flow widgets. If you
 * see an `if` or an `each` in the output, that's a bug.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import type { UINode } from '../schema/ui-spec.js';
import type { EventHandlerOrArray } from '../schema/event-handler.js';

/**
 * One resolved widget. Control-flow nodes (`if`, `each`) never appear —
 * they are collapsed during resolution into the children they selected.
 */
export interface ResolvedNode {
	/** Widget type, e.g. `text`, `button`, `table`. Never `if` or `each`. */
	type: string;
	/** Stable node id when the spec carried one. */
	id?: string;
	/** Props with every `{...}` expression already evaluated. */
	props: Record<string, unknown>;
	/** Resolved `class` string, when the node had one. */
	class?: string;
	/** Named slot this node belongs to in its parent (`header`, `footer`, ...). */
	slot?: string;
	children: ResolvedNode[];
	/**
	 * Two-way binding, resolved. `path` is the concrete state path (loop
	 * placeholders already substituted), `value` is what's at that path now,
	 * and `prop`/`event` are the widget's bind contract — i.e. which prop a
	 * renderer should feed `value` into and which event writes it back.
	 */
	bind?: {
		path: string;
		value: unknown;
		prop: string;
		event: string;
	};
	/**
	 * Event handler specs, keyed by the DOM-ish prop name a renderer would
	 * use (`onclick`, `onchange`, `onopenchange`). These are the raw specs,
	 * NOT bound functions — call `runtime.dispatch(node, 'onclick')` to run
	 * one against live state.
	 */
	events?: Record<string, EventHandlerOrArray>;
	/** The spec node this was resolved from. Useful for editors and debugging. */
	source?: UINode;
}

/** A fully resolved spec: root nodes plus the state they were resolved against. */
export interface ResolvedTree {
	nodes: ResolvedNode[];
	/** Snapshot of state at resolution time (not live — re-resolve to refresh). */
	state: Record<string, unknown>;
}

/** Everything `resolveTree` needs to evaluate a node. */
export interface ResolveContext {
	/** Live state (read through, never written). */
	state: Record<string, unknown>;
	/** Host-provided data bag, exposed to expressions as `data.*`. */
	data?: Record<string, unknown>;
	/** Loop-local variables layered on top (`item`, `index`, custom aliases). */
	loop?: Record<string, unknown>;
	/**
	 * Called for every node whose `type` isn't in the catalog. Defaults to a
	 * console warning. Return `false` to drop the node from the output; the
	 * default keeps it, so an unknown widget surfaces rather than vanishing.
	 */
	onUnknownWidget?: (type: string, node: UINode) => boolean | void;
	/**
	 * Widget catalog membership test. Supply `hasWidget` from the Svelte
	 * registry to reuse it, or your own set for a different renderer. When
	 * omitted, no catalog check runs.
	 */
	isKnownWidget?: (type: string) => boolean;
}
