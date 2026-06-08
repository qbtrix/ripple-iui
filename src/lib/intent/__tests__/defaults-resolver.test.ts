// defaults-resolver.test.ts — genesis V3 Layer 2 (smart auto-fill) unit tests.
// Created 2026-06-08.
// Verifies the PURE resolver: the genesis priority chain (profile → preferences
// → history → time → domain → common), empties-only fill (explicit `default`
// wins / is skipped), and the no-context graceful no-op. No component mount —
// these are plain function tests.
import { describe, it, expect } from 'vitest';
import {
	resolveDefaults,
	getSmartDefault,
	getAllDefaults,
	createTimeContext,
	createDefaultsContext,
	type DefaultsContext,
	type DefaultsField
} from '../defaults-resolver.js';

// A fixed clock so time-based assertions are deterministic.
// 2026-06-10 is a Wednesday (weekday), 09:00 → morning, June → summer.
const FIXED_NOW = new Date('2026-06-10T09:00:00');

describe('no-context graceful no-op', () => {
	it('returns {} when no context is provided', () => {
		const fields: DefaultsField[] = [
			{ id: 'name', type: 'text' },
			{ id: 'quantity', type: 'number' }
		];
		expect(resolveDefaults(fields, undefined)).toEqual({});
	});

	it('returns {} for an empty / undefined field list', () => {
		expect(resolveDefaults([], createDefaultsContext({ now: FIXED_NOW }))).toEqual({});
		expect(resolveDefaults(undefined, createDefaultsContext({ now: FIXED_NOW }))).toEqual({});
	});
});

describe('profile priority (highest)', () => {
	it('fills name/email/phone from the user profile', () => {
		const ctx: DefaultsContext = {
			user: { profile: { name: 'Ada Lovelace', email: 'ada@x.io', phone: '555' } }
		};
		const out = resolveDefaults(
			[{ id: 'name' }, { id: 'email' }, { id: 'phone' }],
			ctx
		);
		expect(out).toEqual({ name: 'Ada Lovelace', email: 'ada@x.io', phone: '555' });
	});

	it('profile beats preferences for the same field', () => {
		const ctx: DefaultsContext = {
			user: {
				profile: { email: 'profile@x.io' },
				preferences: { email: 'pref@x.io' }
			}
		};
		expect(getSmartDefault({ id: 'email' }, ctx)).toBe('profile@x.io');
	});
});

describe('preferences and history priority', () => {
	it('falls to preferences when no profile match', () => {
		const ctx: DefaultsContext = { user: { preferences: { newsletter: true } } };
		expect(getSmartDefault({ id: 'newsletter', type: 'checkbox' }, ctx)).toBe(true);
	});

	it('uses the most recent history entry for a field', () => {
		const ctx: DefaultsContext = {
			user: {
				history: [
					{ type: 'city', value: 'Paris', timestamp: '2026-01-01T00:00:00Z' },
					{ type: 'city', value: 'Berlin', timestamp: '2026-05-01T00:00:00Z' }
				]
			}
		};
		expect(getSmartDefault({ id: 'city' }, ctx)).toBe('Berlin');
	});
});

describe('time-based priority', () => {
	it('suggests today (ISO date) for a plain date field', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		expect(resolveDefaults([{ id: 'date', type: 'date' }], ctx)).toEqual({
			date: '2026-06-10'
		});
	});

	it('suggests tomorrow for a checkout/end/return date field', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		expect(getSmartDefault({ id: 'checkout_date', type: 'date' }, ctx)).toBe('2026-06-11');
	});

	it('suggests next Friday for a travel date on a weekday', () => {
		// 2026-06-10 is Wednesday → next Friday is 2026-06-12.
		const ctx = createDefaultsContext({ now: FIXED_NOW, domain: 'travel' });
		expect(getSmartDefault({ id: 'depart_date', type: 'date' }, ctx)).toBe('2026-06-12');
	});

	it('suggests a dinner time for a food booking in the morning', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW, domain: 'food' });
		expect(getSmartDefault({ id: 'time', type: 'time' }, ctx)).toBe('19:00');
	});
});

describe('domain priority', () => {
	it('fills party_size for the food domain', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW, domain: 'food' });
		expect(getSmartDefault({ id: 'party_size', type: 'number' }, ctx)).toBe(2);
	});

	it('fills cabin class for the travel domain', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW, domain: 'travel' });
		expect(getSmartDefault({ id: 'cabin' }, ctx)).toBe('economy');
	});
});

describe('common patterns (lowest priority)', () => {
	it('defaults quantity to 1', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		expect(getSmartDefault({ id: 'quantity', type: 'number' }, ctx)).toBe(1);
	});

	it('defaults rating to 5', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		expect(getSmartDefault({ id: 'rating', type: 'number' }, ctx)).toBe(5);
	});

	it('leaves an unknown text field empty (undefined)', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		expect(getSmartDefault({ id: 'random_note', type: 'text' }, ctx)).toBeUndefined();
	});
});

describe('empties-only fill', () => {
	it('skips fields that carry an explicit default', () => {
		const ctx: DefaultsContext = {
			user: { profile: { name: 'Ada' } }
		};
		const fields: DefaultsField[] = [
			{ id: 'name', default: 'Pre-set' }, // explicit default → skipped
			{ id: 'email', type: 'email' } // no value → resolver may fill (no profile email → undefined)
		];
		const out = resolveDefaults(fields, ctx);
		// `name` is not in the resolver output because its own default wins.
		expect(out).not.toHaveProperty('name');
	});

	it('getAllDefaults keeps the explicit default and resolves the rest', () => {
		const ctx = createDefaultsContext({ now: FIXED_NOW });
		const out = getAllDefaults(
			[
				{ id: 'quantity', type: 'number', default: 3 },
				{ id: 'rating', type: 'number' }
			],
			ctx
		);
		expect(out).toEqual({ quantity: 3, rating: 5 });
	});
});

describe('createTimeContext (browser Date allowed at runtime)', () => {
	it('derives timeOfDay and season from a fixed clock', () => {
		const tc = createTimeContext(FIXED_NOW);
		expect(tc.timeOfDay).toBe('morning');
		expect(tc.season).toBe('summer');
		expect(tc.isWeekend).toBe(false);
	});
});
