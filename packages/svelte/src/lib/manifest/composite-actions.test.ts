// Guards manifest drift for composite widgets' event handlers. The pocketpaw
// server builds its handler checks from the manifest's EventAction-typed props,
// so a handler a composite dispatches but its manifest entry does not list
// loses its server check silently. Every field a widget in widgets/composite/
// declares as `EventHandlerOrArray` (a top-level prop or a row field such as
// items[].actions) must appear in its manifest entry typed as an EventAction.
// Ceiling: the match is by field name, so a name shared by two row types
// (exec-dashboard's `actions`) passes once either row lists it.
import { describe, expect, it } from 'vitest';
import { manifestEntries } from './index.js';

// Vite's raw glob, not node:fs: ripple's tsconfig carries no node types.
const SOURCES = import.meta.glob('../widgets/composite/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

describe('composite handlers are in the manifest as actions', () => {
	it('every EventHandlerOrArray field a composite declares is EventAction-typed in its entry', () => {
		const misses: string[] = [];
		let scanned = 0;
		for (const [path, src] of Object.entries(SOURCES)) {
			// Trailing `;` keeps interface fields and skips `fire(handler: EventHandlerOrArray | undefined)` params.
			const fields = [...new Set([...src.matchAll(/(\w+)\??:\s*EventHandlerOrArray\s*;/g)].map((m) => m[1]))];
			if (fields.length === 0) continue;
			const type = kebab(path.split('/').pop()!.replace('.svelte', ''));
			const entry = manifestEntries.find((e) => e.type === type);
			if (!entry) {
				misses.push(`${type}: no manifest entry`);
				continue;
			}
			scanned++;
			const all = { ...entry.props, ...(entry.events ?? {}) };
			const blob = JSON.stringify(all);
			for (const f of fields) {
				const top = all[f]?.type?.includes('EventAction');
				const nested = new RegExp(`\\b${f}\\??: EventAction\\b`).test(blob);
				if (!top && !nested) misses.push(`${type}: ${f}`);
			}
		}
		expect(scanned).toBeGreaterThan(5);
		expect(misses).toEqual([]);
	});
});
