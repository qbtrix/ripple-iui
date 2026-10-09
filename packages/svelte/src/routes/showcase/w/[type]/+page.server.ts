// /showcase/w/<type>: one widget (or pattern) at full size with its toolbar.
// The specs are the docs page's own (pageSpecs): the example first, then
// every interactive pocket.
import { error } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import { categoryTitle, pageSpecs } from '$lib/site/docs/widgets.js';
import { widgetTitle } from '$lib/site/showcase/catalog.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => manifestEntries.map((e) => ({ type: e.type }));

export const load: PageServerLoad = ({ params }) => {
	const e = manifestEntries.find((w) => w.type === params.type);
	if (!e) error(404, `No widget named ${params.type}`);
	const { example, interactive } = pageSpecs(e);
	return {
		type: e.type,
		title: widgetTitle(e.type),
		description: e.description,
		facet: e.category === 'composite' ? ('patterns' as const) : ('widgets' as const),
		category: { id: e.category, title: categoryTitle(e.category) },
		specs: [{ name: 'Example', spec: example }, ...interactive.map((s) => ({ name: s.name, spec: s.spec }))]
	};
};
