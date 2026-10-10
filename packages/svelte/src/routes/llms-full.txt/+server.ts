// /llms-full.txt: Every docs page's markdown in one file, then a props summary per widget.
import { llmsFullTxt } from '$lib/site/docs/content.js';
import { widgetsLlmsFullTxt } from '$lib/site/docs/widgets.js';

export const prerender = true;
export const GET = () =>
	new Response(`${llmsFullTxt()}\n---\n\n${widgetsLlmsFullTxt()}`, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
