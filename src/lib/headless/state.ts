/**
 * @file state.ts
 * @description `HeadlessStateManager` — the rune-free `StateStore`.
 *
 * Semantically identical to `core/state-manager.svelte.ts`: same path
 * syntax, same auto-creation of intermediate objects, same subscriber
 * contract, same `structuredClone`-with-JSON-fallback on construct and
 * reset. The ONLY difference is reactivity: the Svelte one wraps its
 * backing object in `$state` for fine-grained tracking, this one has a
 * plain object and notifies subscribers. Both satisfy `StateStore`, so
 * the dispatcher and the resolver cannot tell them apart.
 *
 * The two are held in lockstep by `state-parity.test.ts`, which runs one
 * shared operation script against both and asserts the state snapshots
 * and notification traces match step for step.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import type { StateStore, StateSubscriber } from '../core/state-store.js';

function clone(value: Record<string, unknown>): Record<string, unknown> {
	try {
		return structuredClone(value);
	} catch {
		return JSON.parse(JSON.stringify(value));
	}
}

export class HeadlessStateManager implements StateStore {
	private _state: Record<string, unknown> = {};
	private subscribers = new Set<StateSubscriber>();

	constructor(initialState: Record<string, unknown> = {}) {
		this._state = clone(initialState);
	}

	get state(): Record<string, unknown> {
		return this._state;
	}

	get(path: string): unknown {
		if (!path) return undefined;
		const parts = path.split('.');
		let current: unknown = this._state;
		for (const part of parts) {
			if (current === null || current === undefined) return undefined;
			if (typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		return current;
	}

	set(path: string, value: unknown): void {
		if (!path) return;
		const parts = path.split('.');
		const lastKey = parts.pop()!;
		let current: Record<string, unknown> = this._state;
		for (const part of parts) {
			if (current[part] === undefined || current[part] === null) {
				current[part] = {};
			}
			if (typeof current[part] !== 'object') {
				console.warn(`StateManager: Cannot set path "${path}" - "${part}" is not an object`);
				return;
			}
			current = current[part] as Record<string, unknown>;
		}
		current[lastKey] = value;
		this.notify(path, value);
	}

	update(path: string, updater: (current: unknown) => unknown): void {
		const current = this.get(path);
		this.set(path, updater(current));
	}

	has(path: string): boolean {
		return this.get(path) !== undefined;
	}

	delete(path: string): void {
		if (!path) return;
		const parts = path.split('.');
		const lastKey = parts.pop()!;
		let current: Record<string, unknown> = this._state;
		for (const part of parts) {
			if (current[part] === undefined || typeof current[part] !== 'object') return;
			current = current[part] as Record<string, unknown>;
		}
		delete current[lastKey];
		this.notify(path, undefined);
	}

	reset(newState: Record<string, unknown> = {}): void {
		for (const key of Object.keys(this._state)) {
			delete this._state[key];
		}
		Object.assign(this._state, clone(newState));
		this.notify('', undefined);
	}

	subscribe(fn: StateSubscriber): () => void {
		this.subscribers.add(fn);
		return () => {
			this.subscribers.delete(fn);
		};
	}

	private notify(path: string, value: unknown): void {
		for (const fn of this.subscribers) {
			try {
				fn(path, value, this._state);
			} catch (err) {
				console.error('StateManager subscriber threw:', err);
			}
		}
	}
}

export function createHeadlessStateManager(
	initialState: Record<string, unknown> = {}
): HeadlessStateManager {
	return new HeadlessStateManager(initialState);
}
