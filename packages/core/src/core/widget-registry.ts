/**
 * @file widget-registry.ts
 * @description Runtime registry that lets widgets opt in to expose named
 * methods by id, so flow actions like `invoke` can trigger them.
 * @changes
 *   - Initial creation with register / unregister / invoke / has / clear
 *   - Simple nested Map keyed by (widgetId, methodName) — no globals
 */

/** Function signature for a registered widget method. */
export type WidgetMethod = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Per-Ripple-instance registry of widget methods.
 *
 * Widgets that want to be callable from the `invoke` action register
 * themselves inside an `$effect`, keyed by their `id`. Example:
 *
 * ```ts
 * const registry = getContext<WidgetRegistry>('ui-widget-registry');
 * $effect(() => {
 *   if (!id || !registry) return;
 *   const off = registry.register(id, 'open', () => setOpen(true));
 *   return off; // cleanup on unmount
 * });
 * ```
 *
 * Registration is opt-in — widgets without an id do nothing. The registry
 * is instance-scoped (one per Ripple component tree) so id collisions
 * across unrelated renders never happen.
 */
export class WidgetRegistry {
	private methods = new Map<string, Map<string, WidgetMethod>>();

	/**
	 * Register a method on a widget id. Returns an unregister function
	 * suitable for returning from an `$effect`.
	 *
	 * If the same id+method pair already exists, the newer registration
	 * wins (useful for HMR and remounts). The returned unregister is a
	 * no-op if the method has already been replaced.
	 */
	register(id: string, method: string, fn: WidgetMethod): () => void {
		if (!id || !method) {
			return () => {};
		}
		let bucket = this.methods.get(id);
		if (!bucket) {
			bucket = new Map();
			this.methods.set(id, bucket);
		}
		bucket.set(method, fn);
		// Capture references for accurate cleanup — only remove if we
		// are still the registered function.
		const ownFn = fn;
		return () => {
			const current = this.methods.get(id);
			if (current && current.get(method) === ownFn) {
				current.delete(method);
				if (current.size === 0) {
					this.methods.delete(id);
				}
			}
		};
	}

	/**
	 * Invoke a previously registered method. Returns whatever the method
	 * returns (already a value or a promise). Throws nothing — an unknown
	 * target or method resolves to `undefined` and lets the caller warn.
	 */
	invoke(id: string, method: string, args: unknown[] = []): unknown {
		const bucket = this.methods.get(id);
		if (!bucket) return undefined;
		const fn = bucket.get(method);
		if (!fn) return undefined;
		return fn(...args);
	}

	/** Does the given widget id expose the given method? */
	has(id: string, method: string): boolean {
		return this.methods.get(id)?.has(method) ?? false;
	}

	/** Drop all registrations (used by tests). */
	clear(): void {
		this.methods.clear();
	}
}

/** Convenience factory for functional style. */
export function createWidgetRegistry(): WidgetRegistry {
	return new WidgetRegistry();
}
