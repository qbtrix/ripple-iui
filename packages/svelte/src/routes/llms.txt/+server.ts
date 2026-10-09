// /llms.txt: The llmstxt.org index of the docs.
import { llmsTxt } from '$lib/site/docs/content.js';

export const prerender = true;
export const GET = () => new Response(llmsTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
