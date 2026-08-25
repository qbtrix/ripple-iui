/**
 * @file state-manager.svelte.ts
 * @description Reactive state management for the UI renderer using Svelte 5 runes.
 * @changes
 *   - 2026-08-25: the `StateSubscriber` type moved to `./state-store.ts` (and is
 *     re-exported here, so existing imports are unchanged); `StateManager` now
 *     declares `implements StateStore`, which pins it to the same contract the
 *     rune-free `HeadlessStateManager` satisfies. Behaviour is untouched.
 */

import type { StateStore, StateSubscriber } from '@ripple-ui/core';

export type { StateSubscriber };

export class StateManager implements StateStore {
  private _state = $state<Record<string, unknown>>({});
  private subscribers = new Set<StateSubscriber>();

  constructor(initialState: Record<string, unknown> = {}) {
    try {
      this._state = structuredClone(initialState);
    } catch {
      this._state = JSON.parse(JSON.stringify(initialState));
    }
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
    Object.assign(this._state, structuredClone(newState));
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

export function createStateManager(initialState: Record<string, unknown> = {}): StateManager {
  return new StateManager(initialState);
}
