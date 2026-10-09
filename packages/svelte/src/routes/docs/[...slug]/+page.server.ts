// One docs page, rendered from its markdown at prerender. /docs itself
// redirects to the first page (prerendered as a meta-refresh file), so there is
// no link-only intro page. A broken ```ripple block throws here with file and
// line; svelte.config.js makes a /docs prerender error fail the build.
import { error, redirect } from '@sveltejs/kit';
import { pages, prevNext } from '$lib/site/docs/content.js';
import { renderDoc, toPlainMarkdown } from '$lib/site/docs/markdown.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => [{ slug: '' }, ...pages.map((p) => ({ slug: p.slug }))];

export const load: PageServerLoad = ({ params }) => {
	if (!params.slug) redirect(308, `/docs/${pages[0].slug}`);
	const page = pages.find((p) => p.slug === params.slug);
	if (!page) error(404, 'No docs page here');
	return {
		slug: page.slug,
		...renderDoc(page.raw, page.file),
		markdown: toPlainMarkdown(page.raw, page.file),
		...prevNext(page.slug)
	};
};
