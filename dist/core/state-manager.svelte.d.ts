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
export declare class StateManager {
    /** The reactive state object */
    private _state;
    constructor(initialState?: Record<string, unknown>);
    /**
     * Get the entire state object (readonly snapshot).
     */
    get state(): Record<string, unknown>;
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
    get(path: string): unknown;
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
    set(path: string, value: unknown): void;
    /**
     * Update a value using a function.
     *
     * @param path - Dot-separated path
     * @param updater - Function that receives current value and returns new value
     *
     * @example
     * manager.update('count', (n) => (n as number) + 1);
     */
    update(path: string, updater: (current: unknown) => unknown): void;
    /**
     * Check if a path exists and has a non-undefined value.
     */
    has(path: string): boolean;
    /**
     * Delete a value at path.
     */
    delete(path: string): void;
    /**
     * Reset state to initial values or new state.
     */
    reset(newState?: Record<string, unknown>): void;
}
/**
 * Create a new StateManager instance.
 * Convenience function for functional style.
 */
export declare function createStateManager(initialState?: Record<string, unknown>): StateManager;
