// routes/showcase/showcase.server.test.ts — The showcase reads the docs'
// specs, so the two cannot drift: every widget and pattern card, and every
// /showcase/w/<type> page, previews exactly what /docs/widgets/<type> does
// (pageSpecs). Also pins the facet split, the prerender entries, and that
// every widget page's specs survive the Open in Playground link.
import { describe, expect, test } from 'vitest';
import { manifestEntries } from '$lib/manifest/index.js';
import { pageSpecs } from '$lib/site/docs/widgets.js';
import { APPS } from '$lib/site/showcase/catalog.js';
import { FLOWS } from '$lib/site/showcase/flows.js';
import { playgroundHref, specFromUrl } from '$lib/site/specFromUrl.js';
import { load as indexLoad } from './+page.server.js';
import { entries as widgetEntries, load as widgetLoad } from './w/[type]/+page.server.js';
import { entries as flowEntries, load as flowLoad } from './flows/[id]/+page.server.js';

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const call = (fn: unknown, params: Record<string, string> = {}): Loose => (fn as (e: unknown) => Loose)({ params });

describe('/showcase index data', () => {
	const data = call(indexLoad);
	test('one item per app, manifest entry and flow', () => {
		expect(data.items).toHaveLength(APPS.length + manifestEntries.length + FLOWS.length);
	});
	test('widget and pattern cards preview the docs page spec, not a copy', () => {
		for (const e of manifestEntries) {
			const facet = e.category === 'composite' ? 'patterns' : 'widgets';
			expect(data.specs[`${facet}:${e.type}`], e.type).toEqual(pageSpecs(e).example);
			expect(data.items.find((i: Loose) => i.id === e.type && i.facet === facet)?.href).toBe(`/showcase/w/${e.type}`);
		}
	});
	test('patterns are exactly the composite entries and widgets are the rest', () => {
		const n = (f: string) => data.items.filter((i: Loose) => i.facet === f).length;
		const composite = manifestEntries.filter((e) => e.category === 'composite').length;
		expect(n('patterns')).toBe(composite);
		expect(n('widgets')).toBe(manifestEntries.length - composite);
		expect(data.categories.map((c: Loose) => c.id)).not.toContain('composite');
	});
	test('the spotlight is a flow', () => {
		expect(FLOWS.find((f) => f.id === data.spotlight.id)?.spec).toEqual(data.spotlight.spec);
	});
});

describe('/showcase/w/<type>', () => {
	test('prerenders one page per manifest entry', async () => {
		const types = (await widgetEntries()).map((p) => p.type);
		expect(types.toSorted()).toEqual(manifestEntries.map((e) => e.type).toSorted());
	});
	test('shows the docs example first, then the docs pockets', () => {
		for (const e of manifestEntries) {
			const { example, interactive } = pageSpecs(e);
			const d = call(widgetLoad, { type: e.type });
			expect(d.specs.map((s: Loose) => s.spec), e.type).toEqual([example, ...interactive.map((s) => s.spec)]);
		}
	});
	test('every widget spec opens in the playground unchanged', () => {
		for (const e of manifestEntries) {
			for (const s of call(widgetLoad, { type: e.type }).specs) {
				const href = playgroundHref(s.spec);
				expect(href, e.type).not.toBeNull();
				const back = specFromUrl(href!.slice(href!.indexOf('?')));
				expect(back && 'text' in back ? JSON.parse(back.text) : back, e.type).toEqual(s.spec);
			}
		}
	});
	test('an unknown type is a 404', () => {
		expect(() => call(widgetLoad, { type: 'no-such-widget' })).toThrow();
	});
});

describe('/showcase/flows/<id>', () => {
	test('prerenders every flow and serves its spec', async () => {
		const ids = (await flowEntries()).map((p) => p.id);
		expect(ids).toEqual(FLOWS.map((f) => f.id));
		for (const f of FLOWS) expect(call(flowLoad, { id: f.id }).specs[0].spec).toEqual(f.spec);
	});
});
