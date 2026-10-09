// /llms-full.txt: Every docs page's markdown in one file.
import { llmsFullTxt } from '$lib/site/docs/content.js';

export const prerender = true;
export const GET = () => new Response(llmsFullTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
