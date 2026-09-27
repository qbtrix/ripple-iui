/**
 * @file runtime-base.ts
 * @description What the headless runtimes share: state, the memoized resolved
 * tree, subscriptions, and dispatch with loop variables. The dispatcher is
 * passed in, so this module never imports the full `EventDispatcher` and a
 * runtime that doesn't need it can leave it out of the bundle.
 *
 * See runtime.ts for the design notes (pull-based reactivity, host actions).
 *
 * @changes
 *   - 2026-09-27: created by moving the body of `RippleHeadless` here
 *     unchanged, with the dispatcher injected. `RippleHeadless` (runtime.ts)
 *     and `SlimHeadless` (slim.ts) both extend it.
 */

import type { UINode } from '../schema/ui-spec.js';
import type { EventHandlerOrArray } from '../schema/event-handler.js';
import type { BaseDispatcher, OnEventCallback } from '../core/base-dispatcher.js';
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

/** Builds the dispatcher a runtime runs actions with. */
export type DispatcherFactory<D extends BaseDispatcher> = (
	state: StateStore,
	onEvent?: OnEventCallback
) => D;

/**
 * Everything the headless runtimes share. The only difference between them is
 * the dispatcher: `RippleHeadless` runs every action, `SlimHeadless` runs the
 * local state actions and host events only.
 */
export class HeadlessRuntimeBase<D extends BaseDispatcher = BaseDispatcher> {
	readonly state: StateStore;
	readonly dispatcher: D;

	private spec: UINode | UINode[];
	private data: Record<string, unknown>;
	private isKnownWidget?: (type: string) => boolean;
	private onUnknownWidget?: (type: string, node: UINode) => boolean | void;

	/** Memoized tree; invalidated by any state mutation or `setSpec`. */
	private cached: ResolvedTree | null = null;
	private treeSubscribers = new Set<(tree: ResolvedTree) => void>();

	constructor(options: HeadlessRuntimeOptions, createDispatcher: DispatcherFactory<D>) {
		this.spec = options.spec;
		this.data = options.data ?? {};
		this.isKnownWidget = options.isKnownWidget;
		this.onUnknownWidget = options.onUnknownWidget;

		this.state = options.store ?? new HeadlessStateManager(options.state ?? {});
		this.dispatcher = createDispatcher(this.state, options.onEvent);

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
		await this.dispatchHandler(handler, value, node.loop);
	}

	/**
	 * Run a handler spec directly, outside any node. `loop` layers loop
	 * variables (`item`, `index`, ...) into the resolver context.
	 */
	async dispatchHandler(
		handler: EventHandlerOrArray,
		value?: unknown,
		loop?: Record<string, unknown>
	): Promise<void> {
		await this.dispatcher.dispatch(
			handler,
			{ state: this.state.state, data: this.data, ...(loop ?? {}) },
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
