// /docs/<page>.md: the page's raw markdown, titled, for people and models.
import { error } from '@sveltejs/kit';
import { pages } from '$lib/site/docs/content.js';
import { toPlainMarkdown } from '$lib/site/docs/markdown.js';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => pages.map((p) => ({ slug: p.slug }));

export const GET: RequestHandler = ({ params }) => {
	const page = pages.find((p) => p.slug === params.slug);
	if (!page) error(404, 'No docs page here');
	return new Response(toPlainMarkdown(page.raw, page.file), {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
