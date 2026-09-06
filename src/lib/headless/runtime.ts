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
 */

import type { UINode } from '../schema/ui-spec.js';
import type { EventHandlerOrArray } from '../schema/event-handler.js';
import {
	EventDispatcher,
	type OnEventCallback
} from '../core/event-dispatcher.js';
import type { StateStore, StateSubscriber } from '../core/state-store.js';
import { HeadlessStateManager } from './state.js';
import { resolveTree } from './resolve-tree.js';
import type { ResolvedNode, ResolvedTree } from './types.js';

export interface HeadlessRuntimeOptions {
	/** The spec to render. A single root node or a list of them. */
	spec: UINode | UINode[];
	/** Initial state. Cloned on construction, never mutated in place. */
	state?: Record<string, unknown>;
	/** Host data bag, readable from expressions as `data.*`. */
	data?: Record<string, unknown>;
	/**
	 * Host callback for the externally-handled actions (`api`, `navigate`,
	 * `emit`, `toast`, `open`, `run_source`, `call_binding`, `invoke_tool`,
	 * `animate`, ...). Identical contract to the Svelte runtime's `onEvent`.
	 */
	onEvent?: OnEventCallback;
	/** Catalog membership test. Pass `hasWidget` to reuse the Svelte registry. */
	isKnownWidget?: (type: string) => boolean;
	/** Called for nodes failing `isKnownWidget`. Return false to drop them. */
	onUnknownWidget?: (type: string, node: UINode) => boolean | void;
	/**
	 * Supply a different `StateStore`. Defaults to `HeadlessStateManager`.
	 * Pass the rune-based `StateManager` to run this runtime inside a Svelte
	 * app and get fine-grained reactivity for free.
	 */
	store?: StateStore;
}

export class RippleHeadless {
	readonly state: StateStore;
	readonly dispatcher: EventDispatcher;

	private spec: UINode | UINode[];
	private data: Record<string, unknown>;
	private isKnownWidget?: (type: string) => boolean;
	private onUnknownWidget?: (type: string, node: UINode) => boolean | void;

	/** Memoized tree; invalidated by any state mutation or `setSpec`. */
	private cached: ResolvedTree | null = null;
	private treeSubscribers = new Set<(tree: ResolvedTree) => void>();

	constructor(options: HeadlessRuntimeOptions) {
		this.spec = options.spec;
		this.data = options.data ?? {};
		this.isKnownWidget = options.isKnownWidget;
		this.onUnknownWidget = options.onUnknownWidget;

		this.state = options.store ?? new HeadlessStateManager(options.state ?? {});
		this.dispatcher = new EventDispatcher(this.state, options.onEvent);

		// Any state write invalidates the memo and notifies tree observers.
		this.state.subscribe(() => {
			this.cached = null;
			if (this.treeSubscribers.size === 0) return;
			const tree = this.tree;
			for (const fn of this.treeSubscribers) {
				try {
					fn(tree);
				} catch (err) {
					console.error('[Ripple headless] tree subscriber threw:', err);
				}
			}
		});
	}

	/** The current resolved tree. Recomputed only when state or spec changed. */
	get tree(): ResolvedTree {
		if (!this.cached) {
			this.cached = resolveTree(this.spec, {
				state: this.state.state,
				data: this.data,
				isKnownWidget: this.isKnownWidget,
				onUnknownWidget: this.onUnknownWidget
			});
		}
		return this.cached;
	}

	/** Swap the spec (agent redraft, streaming update) and invalidate the tree. */
	setSpec(spec: UINode | UINode[]): void {
		this.spec = spec;
		this.cached = null;
	}

	/** Replace the host data bag and invalidate the tree. */
	setData(data: Record<string, unknown>): void {
		this.data = data;
		this.cached = null;
	}

	/**
	 * Run one of a resolved node's handlers.
	 *
	 * `event` is the renderer-prop name from `node.events` (`onclick`,
	 * `onchange`, ...). When the node has a `bind` and the event is its bind
	 * contract's event, the bound path is written first — the same order
	 * NodeRenderer uses, so a bound `on_change` handler observes the new
	 * value rather than the old one.
	 */
	async dispatch(node: ResolvedNode, event: string, value?: unknown): Promise<void> {
		if (node.bind && event === node.bind.event) {
			this.state.set(node.bind.path, value);
		}
		const handler = node.events?.[event];
		if (!handler) return;
		await this.dispatchHandler(handler, value);
	}

	/** Run a handler spec directly, outside any node. */
	async dispatchHandler(handler: EventHandlerOrArray, value?: unknown): Promise<void> {
		await this.dispatcher.dispatch(
			handler,
			{ state: this.state.state, data: this.data },
			value
		);
	}

	/** Observe resolved trees. Returns an unsubscribe function. */
	subscribe(fn: (tree: ResolvedTree) => void): () => void {
		this.treeSubscribers.add(fn);
		return () => {
			this.treeSubscribers.delete(fn);
		};
	}

	/** Observe raw state mutations (path-level). Returns an unsubscribe. */
	subscribeState(fn: StateSubscriber): () => void {
		return this.state.subscribe(fn);
	}

	/** Depth-first walk of the current tree. Handy for tests and extraction. */
	*walk(): Generator<ResolvedNode> {
		function* visit(nodes: ResolvedNode[]): Generator<ResolvedNode> {
			for (const node of nodes) {
				yield node;
				yield* visit(node.children);
			}
		}
		yield* visit(this.tree.nodes);
	}

	/** First node matching `id` in the current tree, or undefined. */
	findById(id: string): ResolvedNode | undefined {
		for (const node of this.walk()) {
			if (node.id === id) return node;
		}
		return undefined;
	}

	/** Every node of a given widget type in the current tree. */
	findByType(type: string): ResolvedNode[] {
		const out: ResolvedNode[] = [];
		for (const node of this.walk()) {
			if (node.type === type) out.push(node);
		}
		return out;
	}
}

export function createHeadlessRuntime(options: HeadlessRuntimeOptions): RippleHeadless {
	return new RippleHeadless(options);
}
