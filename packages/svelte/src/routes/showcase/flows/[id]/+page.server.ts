// /showcase/flows/<id>: one flow from flows.ts at full size with its toolbar.
// Server-side so the page ships only its own spec, not all fourteen.
import { error } from '@sveltejs/kit';
import { FLOWS } from '$lib/site/showcase/flows.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => FLOWS.map((f) => ({ id: f.id }));

export const load: PageServerLoad = ({ params }) => {
	const f = FLOWS.find((x) => x.id === params.id);
	if (!f) error(404, `No flow named ${params.id}`);
	return { id: f.id, title: f.title, line: f.line, specs: [{ name: 'Flow', spec: f.spec }] };
};
