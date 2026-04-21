/**
 * @file widget-registry.test.ts
 * @description Unit tests for WidgetRegistry — register, invoke, unregister round trips.
 * @changes
 *   - Initial creation for Phase B flow-actions feature
 */

import { describe, expect, it, vi } from 'vitest';
import { WidgetRegistry, createWidgetRegistry } from './widget-registry.js';

describe('WidgetRegistry', () => {
	it('registers and invokes a method by id', () => {
		const r = new WidgetRegistry();
		const fn = vi.fn(() => 'hi');
		r.register('card1', 'ping', fn);
		const out = r.invoke('card1', 'ping');
		expect(fn).toHaveBeenCalledTimes(1);
		expect(out).toBe('hi');
	});

	it('forwards args to the registered method', () => {
		const r = new WidgetRegistry();
		const fn = vi.fn((a: number, b: number) => a + b);
		r.register('calc', 'add', fn as never);
		const out = r.invoke('calc', 'add', [2, 3]);
		expect(fn).toHaveBeenCalledWith(2, 3);
		expect(out).toBe(5);
	});

	it('unregister removes only the specific method', () => {
		const r = new WidgetRegistry();
		const open = vi.fn();
		const close = vi.fn();
		const offOpen = r.register('modal', 'open', open);
		r.register('modal', 'close', close);

		offOpen();

		expect(r.has('modal', 'open')).toBe(false);
		expect(r.has('modal', 'close')).toBe(true);
	});

	it('unregister is idempotent — second call is a no-op', () => {
		const r = new WidgetRegistry();
		const off = r.register('m', 'x', () => {});
		off();
		// Calling again should not throw.
		expect(() => off()).not.toThrow();
	});

	it('unregister does NOT drop a replacement registration', () => {
		const r = new WidgetRegistry();
		const first = vi.fn();
		const second = vi.fn();
		const offFirst = r.register('m', 'x', first);
		r.register('m', 'x', second); // replace

		offFirst(); // old cleanup should not remove the newer function
		expect(r.has('m', 'x')).toBe(true);
		r.invoke('m', 'x');
		expect(second).toHaveBeenCalledTimes(1);
		expect(first).not.toHaveBeenCalled();
	});

	it('invoke on unknown target returns undefined (no throw)', () => {
		const r = new WidgetRegistry();
		expect(r.invoke('ghost', 'poof')).toBeUndefined();
	});

	it('has() reflects registration state', () => {
		const r = new WidgetRegistry();
		expect(r.has('m', 'open')).toBe(false);
		r.register('m', 'open', () => {});
		expect(r.has('m', 'open')).toBe(true);
	});

	it('clear() drops every registration', () => {
		const r = new WidgetRegistry();
		r.register('a', 'x', () => {});
		r.register('b', 'y', () => {});
		r.clear();
		expect(r.has('a', 'x')).toBe(false);
		expect(r.has('b', 'y')).toBe(false);
	});

	it('createWidgetRegistry factory returns a working instance', () => {
		const r = createWidgetRegistry();
		r.register('z', 'm', () => 42);
		expect(r.invoke('z', 'm')).toBe(42);
	});

	it('ignores empty id or method names (return no-op unregister)', () => {
		const r = new WidgetRegistry();
		const off = r.register('', 'x', () => {});
		expect(r.has('', 'x')).toBe(false);
		expect(() => off()).not.toThrow();
	});
});
