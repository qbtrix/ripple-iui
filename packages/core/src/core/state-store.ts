/**
 * @file state-store.ts
 * @description The state contract shared by every Ripple runtime.
 *
 * Ripple has two state implementations with identical semantics and
 * different reactivity strategies:
 *
 *   - `StateManager` (`./state-manager.svelte.ts`) — Svelte 5 `$state`
 *     runes. Fine-grained reactivity, requires the Svelte compiler.
 *   - `HeadlessStateManager` (`../headless/state.ts`) — a plain object
 *     plus subscribers. No compiler, no framework, runs in bare Node.
 *
 * Everything downstream (EventDispatcher, resolveTree) depends on THIS
 * interface, never on either class, which is what makes the engine
 * renderer-agnostic. The dispatcher already imported `StateManager` as
 * `import type`, so widening it to `StateStore` is an erasable change
 * with no runtime effect on the Svelte path.
 *
 * @changes
 *   - 2026-08-25: created — extracted the structural contract from
 *     state-manager.svelte.ts so a non-Svelte runtime can satisfy it
 *     (headless core, wave 1).
 */

/** Notified after every mutation. `path` is '' for a whole-state reset. */
export type StateSubscriber = (
	path: string,
	value: unknown,
	state: Record<string, unknown>
) => void;

/**
 * Path-addressed reactive state.
 *
 * Paths are dot-delimited (`"user.profile.name"`). `set` auto-creates
 * intermediate objects; reading a path through a non-object yields
 * `undefined` rather than throwing.
 */
export interface StateStore {
	/** The live state object. Implementations may return a reactive proxy. */
	readonly state: Record<string, unknown>;
	get(path: string): unknown;
	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	has(path: string): boolean;
	delete(path: string): void;
	reset(newState?: Record<string, unknown>): void;
	/** Returns an unsubscribe function. */
	subscribe(fn: StateSubscriber): () => void;
}
