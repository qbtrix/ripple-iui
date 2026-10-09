// /docs/widgets/examples.json: one spec per widget type, for the index's card
// grid. A separate file so the index HTML stays small and the specs load only
// once a card is in view. Listed in svelte.config.js prerender entries, because
// the crawler never sees a client-side fetch. Each card shows what the widget's
// page previews (pageSpecs): the example, or the first pocket for a widget whose
// bare example renders nothing.
import { json } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import { pageSpecs } from '$lib/site/docs/widgets.js';

export const prerender = true;

export const GET = () => json(Object.fromEntries(manifestEntries.map((e) => [e.type, pageSpecs(e).example])));
