// descriptions.test.ts — Manifest prose must not carry em or en dashes. The
// descriptions ship to models (manifest.json) and render on /docs/widgets, so
// the house style (no dashes) is enforced here rather than by review.
import { describe, expect, it } from 'vitest';
import { manifestEntries } from './index.js';

const DASH = /[\u2014\u2013]/;

function offenders(): string[] {
	const out: string[] = [];
	const check = (where: string, text: string | undefined) => {
		if (text && DASH.test(text)) out.push(`${where}: ${text}`);
	};
	for (const e of manifestEntries) {
		check(e.type, e.description);
		for (const group of ['props', 'events', 'nodeFields'] as const) {
			for (const [name, spec] of Object.entries(e[group] ?? {})) check(`${e.type}.${group}.${name}`, spec.description);
		}
		for (const p of e.pockets ?? []) check(`${e.type}.pockets.${p.name}`, p.description);
	}
	return out;
}

describe('manifest descriptions', () => {
	it('have no em or en dashes', () => {
		expect(offenders()).toEqual([]);
	});
});
