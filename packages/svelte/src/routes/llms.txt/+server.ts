// /llms.txt: The llmstxt.org index of the docs, then one line per widget page.
import { llmsTxt } from '$lib/site/docs/content.js';
import { widgetsLlmsTxt } from '$lib/site/docs/widgets.js';

export const prerender = true;
export const GET = () =>
	new Response(llmsTxt() + widgetsLlmsTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
