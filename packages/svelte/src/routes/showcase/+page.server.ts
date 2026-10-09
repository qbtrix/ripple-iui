// /showcase: every card's data, built at prerender. Widget and pattern cards
// preview exactly what /docs/widgets/<type> previews (pageSpecs), so the two
// pages cannot drift; the manifest itself stays on the server.
import { manifestEntries } from '$lib/manifest/index.js';
import { CATEGORIES, categoryTitle, orderedEntries, pageSpecs } from '$lib/site/docs/widgets.js';
import { APPS, appItems, widgetTitle, type ShowcaseItem } from '$lib/site/showcase/catalog.js';
import { FLOWS } from '$lib/site/showcase/flows.js';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => {
	const specs: Record<string, Record<string, unknown>> = {};
	const items: ShowcaseItem[] = appItems(APPS);
	for (const e of orderedEntries(manifestEntries)) {
		const facet = e.category === 'composite' ? 'patterns' : 'widgets';
		items.push({ id: e.type, facet, title: widgetTitle(e.type), line: e.description, category: e.category, href: `/showcase/w/${e.type}` });
		specs[`${facet}:${e.type}`] = pageSpecs(e).example;
	}
	for (const f of FLOWS) {
		items.push({ id: f.id, facet: 'flows', title: f.title, line: f.line, category: 'Flow', href: `/showcase/flows/${f.id}` });
		specs[`flows:${f.id}`] = f.spec;
	}
	const spotlight = FLOWS.find((f) => f.id === 'issue-tracker')!;
	return {
		items,
		specs,
		categories: CATEGORIES.filter((c) => c.id !== 'composite').map((c) => ({ id: c.id, title: categoryTitle(c.id) })),
		spotlight: { id: spotlight.id, title: spotlight.title, line: spotlight.line, spec: spotlight.spec }
	};
};
