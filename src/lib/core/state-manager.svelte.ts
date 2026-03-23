/**
 * @file state-manager.svelte.ts
 * @description Reactive state management for the UI renderer using Svelte 5 runes.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with StateManager class
 *   - Path-based get/set operations with dot notation support
 *   - Svelte 5 $state rune for reactivity
 */

/**
 * StateManager handles all reactive state for a UIRenderer instance.
 *
 * Features:
 * - Dot-notation path access: "user.profile.name"
 * - Automatic reactivity via Svelte 5 $state
 * - Immutable updates that trigger re-renders
 *
 * @example
 * const manager = new StateManager({ count: 0, user: { name: 'Alice' } });
 * manager.get('count'); // 0
 * manager.get('user.name'); // 'Alice'
 * manager.set('count', 1); // triggers reactivity
 */
export class StateManager {
	/** The reactive state object */
	private _state = $state<Record<string, unknown>>({});

	constructor(initialState: Record<string, unknown> = {}) {
		this._state = structuredClone(initialState);
	}

	/**
	 * Get the entire state object (readonly snapshot).
	 */
	get state(): Record<string, unknown> {
		return this._state;
	}

	/**
	 * Get a value by dot-notation path.
	 *
	 * @param path - Dot-separated path like "user.profile.name"
	 * @returns The value at path, or undefined if not found
	 *
	 * @example
	 * manager.get('user.name'); // 'Alice'
	 * manager.get('nonexistent'); // undefined
	 */
	get(path: string): unknown {
		if (!path) return undefined;

		const parts = path.split('.');
		let current: unknown = this._state;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}
			if (typeof current !== 'object') {
				return undefined;
			}
			current = (current as Record<string, unknown>)[part];
		}

		return current;
	}

	/**
	 * Set a value by dot-notation path.
	 * Creates intermediate objects if they don't exist.
	 *
	 * @param path - Dot-separated path like "user.profile.name"
	 * @param value - The value to set
	 *
	 * @example
	 * manager.set('user.name', 'Bob');
	 * manager.set('deeply.nested.value', 42); // creates intermediate objects
	 */
	set(path: string, value: unknown): void {
		if (!path) return;

		const parts = path.split('.');
		const lastKey = parts.pop()!;

		// Navigate to parent, creating objects as needed
		let current: Record<string, unknown> = this._state;
		for (const part of parts) {
			if (current[part] === undefined || current[part] === null) {
				current[part] = {};
			}
			if (typeof current[part] !== 'object') {
				// Can't traverse through non-object
				console.warn(`StateManager: Cannot set path "${path}" - "${part}" is not an object`);
				return;
			}
			current = current[part] as Record<string, unknown>;
		}

		// Set the final value - Svelte 5 will track this mutation
		current[lastKey] = value;
	}

	/**
	 * Update a value using a function.
	 *
	 * @param path - Dot-separated path
	 * @param updater - Function that receives current value and returns new value
	 *
	 * @example
	 * manager.update('count', (n) => (n as number) + 1);
	 */
	update(path: string, updater: (current: unknown) => unknown): void {
		const current = this.get(path);
		this.set(path, updater(current));
	}

	/**
	 * Check if a path exists and has a non-undefined value.
	 */
	has(path: string): boolean {
		return this.get(path) !== undefined;
	}

	/**
	 * Delete a value at path.
	 */
	delete(path: string): void {
		if (!path) return;

		const parts = path.split('.');
		const lastKey = parts.pop()!;

		let current: Record<string, unknown> = this._state;
		for (const part of parts) {
			if (current[part] === undefined || typeof current[part] !== 'object') {
				return; // Path doesn't exist
			}
			current = current[part] as Record<string, unknown>;
		}

		delete current[lastKey];
	}

	/**
	 * Reset state to initial values or new state.
	 */
	reset(newState: Record<string, unknown> = {}): void {
		// Clear current state
		for (const key of Object.keys(this._state)) {
			delete this._state[key];
		}
		// Set new state
		Object.assign(this._state, structuredClone(newState));
	}
}

/**
 * Create a new StateManager instance.
 * Convenience function for functional style.
 */
export function createStateManager(initialState: Record<string, unknown> = {}): StateManager {
	return new StateManager(initialState);
}
