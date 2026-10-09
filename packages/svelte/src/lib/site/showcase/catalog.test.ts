// site/showcase/catalog.test.ts — The /showcase index logic: URL state round
// trips, facet and category counts, the filter, the apps list against the
// real sub-route folders, the flows' public copy, and that every showcase
// spec survives the Open in Playground link (specToUrl -> specFromUrl).
import { describe, expect, test } from 'vitest';
import { specFromUrl, specToUrl, playgroundHref, SPEC_URL_MAX } from '../specFromUrl.js';
import {
	APPS,
	appItems,
	categoryCounts,
	DEFAULT_FACET,
	facetCounts,
	filterItems,
	matches,
	parseState,
	toSearch,
	widgetTitle,
	type ShowcaseItem
} from './catalog.js';
import { FLOWS } from './flows.js';

const item = (facet: ShowcaseItem['facet'], id: string, category = 'x', title = widgetTitle(id)): ShowcaseItem => ({
	id,
	facet,
	title,
	line: '',
	category,
	href: `/${id}`
});
const items = [
	item('apps', 'classic', 'App', 'Classic pockets'),
	item('widgets', 'chart', 'data'),
	item('widgets', 'sparkline', 'data'),
	item('widgets', 'button', 'input'),
	item('patterns', 'exec-dashboard', 'composite'),
	item('flows', 'invoice', 'Flow', 'Invoice builder')
];

describe('URL state', () => {
	test('defaults parse from an empty search and serialise to nothing', () => {
		expect(parseState('')).toEqual({ f: DEFAULT_FACET, c: '', q: '' });
		expect(toSearch(parseState(''))).toBe('');
	});
	test('round trips facet, category and query', () => {
		const s = parseState('?f=widgets&c=data&q=chart');
		expect(s).toEqual({ f: 'widgets', c: 'data', q: 'chart' });
		expect(toSearch(s)).toBe('?f=widgets&c=data&q=chart');
		expect(parseState(toSearch(s))).toEqual(s);
	});
	test('an unknown facet falls back and a category outside widgets is dropped', () => {
		expect(parseState('?f=nope&q=x').f).toBe(DEFAULT_FACET);
		expect(parseState('?f=flows&c=data').c).toBe('');
		expect(toSearch({ f: 'flows', c: 'data', q: '' })).toBe('?f=flows');
	});
	test('the query is trimmed on the way out and capped on the way in', () => {
		expect(toSearch({ f: 'apps', c: '', q: '  chart ' })).toBe('?q=chart');
		expect(parseState(`?q=${'a'.repeat(500)}`).q).toHaveLength(100);
	});
});

describe('filtering', () => {
	test('every word must hit the title, id or category, case-insensitive', () => {
		expect(matches(items[1], 'CHA')).toBe(true);
		expect(matches(items[1], 'data chart')).toBe(true);
		expect(matches(items[1], 'data button')).toBe(false);
	});
	test('filterItems keeps the facet, the category and the query', () => {
		expect(filterItems(items, { f: 'widgets', c: '', q: '' }).map((i) => i.id)).toEqual(['chart', 'sparkline', 'button']);
		expect(filterItems(items, { f: 'widgets', c: 'data', q: '' }).map((i) => i.id)).toEqual(['chart', 'sparkline']);
		expect(filterItems(items, { f: 'widgets', c: '', q: 'spark' }).map((i) => i.id)).toEqual(['sparkline']);
		expect(filterItems(items, { f: 'apps', c: '', q: 'pockets' }).map((i) => i.id)).toEqual(['classic']);
	});
	test('facet counts follow the query; category counts drop empty categories', () => {
		expect(facetCounts(items, '')).toEqual({ apps: 1, widgets: 3, patterns: 1, flows: 1 });
		expect(facetCounts(items, 'dashboard')).toEqual({ apps: 0, widgets: 0, patterns: 1, flows: 0 });
		expect(categoryCounts(items, '', ['input', 'data', 'media'])).toEqual([
			{ id: 'input', count: 1 },
			{ id: 'data', count: 2 }
		]);
		expect(categoryCounts(items, 'chart', ['input', 'data'])).toEqual([{ id: 'data', count: 1 }]);
	});
});

describe('apps', () => {
	// Direct sub-route pages only: /showcase/w/[type] and /showcase/flows/[id] sit one level deeper.
	const routes = Object.keys(import.meta.glob('/src/routes/showcase/*/+page.svelte')).map((p) => p.split('/')[4]);
	test('every app is a real sub-route, and every hand-built sub-route is an app', () => {
		expect(routes.toSorted()).toEqual(APPS.map((a) => a.slug).toSorted());
	});
	test('app items link to their sub-route', () => {
		expect(appItems().map((i) => i.href)).toEqual(APPS.map((a) => `/showcase/${a.slug}`));
	});
});

/** Every string inside a value, keys excluded. */
const strings = (v: unknown): string[] =>
	typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

describe('flows', () => {
	test('ids are unique and URL-safe', () => {
		const ids = FLOWS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
	});
	test('public copy has no em or en dashes and no emoji', () => {
		// The close and star glyphs (U+2715, U+2605) are button labels, not emoji.
		const copy = [...APPS.flatMap((a) => [a.title, a.line]), ...FLOWS.flatMap((f) => [f.title, f.line, ...strings(f.spec)])];
		const bad = copy.filter((s) => /[–—]|\p{Extended_Pictographic}/u.test(s.replace(/[★✕]/g, '')));
		expect(bad).toEqual([]);
	});
});

describe('Open in Playground', () => {
	test.each(FLOWS.map((f) => [f.id, f.spec] as const))('%s round trips through the playground decoder', (_, spec) => {
		const href = playgroundHref(spec);
		expect(href).not.toBeNull();
		const back = specFromUrl(href!.slice(href!.indexOf('?')));
		expect(back && 'text' in back ? JSON.parse(back.text) : back).toEqual(spec);
	});
	test('non-ASCII survives, and a spec over the cap gets no link', () => {
		const spec = { version: '1.0', ui: { type: 'text', props: { text: 'Español, Français, 日本' } } };
		const back = specFromUrl(`?s=${specToUrl(spec)}`);
		expect(back && 'text' in back && JSON.parse(back.text)).toEqual(spec);
		const huge = { version: '1.0', ui: { type: 'text', props: { text: 'x'.repeat(SPEC_URL_MAX) } } };
		expect(playgroundHref(huge)).toBeNull();
	});
});
