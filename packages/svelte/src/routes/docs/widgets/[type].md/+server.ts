// /docs/widgets/<type>.md: the widget's reference as markdown, generated from its manifest entry.
import { error } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import { widgetMarkdown } from '$lib/site/docs/widgets.js';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => manifestEntries.map((e) => ({ type: e.type }));

export const GET: RequestHandler = ({ params }) => {
	const e = manifestEntries.find((w) => w.type === params.type);
	if (!e) error(404, 'No widget with that type');
	return new Response(widgetMarkdown(e), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
