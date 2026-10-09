// /docs/widgets/<type>: one generated reference page per manifest entry. The
// manifest stays on the server; the page gets only its own entry's data.
import { error } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import {
	categoryTitle,
	exampleSpec,
	interactiveSpecs,
	rows,
	sourceUrl,
	widgetCategories,
	widgetMarkdown,
	widgetPrevNext
} from '$lib/site/docs/widgets.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => manifestEntries.map((e) => ({ type: e.type }));

export const load: PageServerLoad = ({ params }) => {
	const e = manifestEntries.find((w) => w.type === params.type);
	if (!e) error(404, 'No widget with that type');
	const props = rows(e.props);
	const events = rows(e.events);
	const nodeFields = rows(e.nodeFields);
	const interactive = interactiveSpecs(e);
	const headings = [
		{ id: 'example', text: 'Example', depth: 2 },
		...interactive.map((s, i) => ({ id: `interactive-${i}`, text: s.name, depth: 2 })),
		...(props.length ? [{ id: 'props', text: 'Props', depth: 2 }] : []),
		...(events.length ? [{ id: 'events', text: 'Events', depth: 2 }] : []),
		...(nodeFields.length ? [{ id: 'node-fields', text: 'Node fields', depth: 2 }] : [])
	];
	const category = widgetCategories().find((c) => c.id === e.category)!;
	return {
		type: e.type,
		description: e.description,
		category: { id: e.category, title: categoryTitle(e.category) },
		siblings: category.widgets.map((w) => w.type),
		staticSafe: e.staticSafe === true,
		example: exampleSpec(e),
		interactive,
		props,
		events,
		nodeFields,
		headings,
		source: sourceUrl(e.type),
		markdown: widgetMarkdown(e),
		...widgetPrevNext(e.type)
	};
};
