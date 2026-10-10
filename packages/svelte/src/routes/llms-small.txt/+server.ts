// /llms-small.txt: The getting-started pages plus where the widget catalog lives.
import { llmsSmallTxt } from '$lib/site/docs/content.js';

export const prerender = true;
export const GET = () => new Response(llmsSmallTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
