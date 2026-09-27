/**
 * @file manifest/slim-widgets.test.ts
 * @description Holds the standard slim atoms (`SLIM_WIDGETS` in
 * `@ripple-ui/core/manifest`) to a strict subset of this package's full
 * manifest, so a spec written for a slim host is also a valid spec here. It
 * lives in the svelte package because that is where the full widget entries
 * are.
 *
 * For each atom: the type exists in the full manifest; every prop and event it
 * documents exists on the full widget; and every value its type allows is one
 * the full widget's type allows (so `level: 2 | 3 | 4` passes against
 * `1 | 2 | ... | 6`, and a badge variant the full badge lacks fails).
 *
 * @changes
 *   - 2026-09-27: created with SLIM_WIDGETS.
 */

import { describe, it, expect } from 'vitest';
import { SLIM_WIDGETS, buildSlimManifest } from '@ripple-ui/core/manifest';
import { buildManifest } from './index.js';

const full = new Map(buildManifest().widgets.map((w) => [w.type, w]));

/** `"a" | "b" | 2 | number` -> ['"a"', '"b"', '2', 'number'] */
const tokens = (type: string) => type.split('|').map((t) => t.trim()).filter(Boolean);

describe('SLIM_WIDGETS is a subset of the full manifest', () => {
	it('has the atoms slim hosts are expected to draw', () => {
		expect(SLIM_WIDGETS.map((w) => w.type)).toEqual(['text', 'heading', 'badge', 'button', 'flex']);
	});

	for (const slim of SLIM_WIDGETS) {
		describe(slim.type, () => {
			const wide = full.get(slim.type);

			it('exists in the full manifest', () => {
				expect(wide, `no full widget "${slim.type}"`).toBeDefined();
			});

			for (const [name, spec] of Object.entries(slim.props)) {
				it(`prop ${name}: exists, and allows only values the full widget allows`, () => {
					const wideProp = wide?.props[name];
					expect(wideProp, `full ${slim.type} has no prop "${name}"`).toBeDefined();
					const allowed = new Set(tokens(wideProp!.type));
					const extra = tokens(spec.type).filter((t) => !allowed.has(t));
					expect(extra, `values full ${slim.type}.${name} does not allow`).toEqual([]);
				});
			}

			for (const name of Object.keys(slim.events ?? {})) {
				it(`event ${name}: exists on the full widget`, () => {
					expect(wide?.events?.[name]).toBeDefined();
				});
			}

			it('its example only uses documented props', () => {
				const used = Object.keys((slim.example.props ?? {}) as Record<string, unknown>);
				expect(used.filter((p) => !(p in slim.props))).toEqual([]);
			});
		});
	}

	it('builds into a slim manifest', () => {
		const m = buildSlimManifest({ widgets: SLIM_WIDGETS });
		expect(m.widgets.map((w) => w.type)).toEqual(SLIM_WIDGETS.map((w) => w.type));
	});

	it('would catch a value the full widget does not allow', () => {
		const allowed = new Set(tokens(full.get('badge')!.props.variant.type));
		expect(allowed.has('"neon"')).toBe(false);
	});
});
