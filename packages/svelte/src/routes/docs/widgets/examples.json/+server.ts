// /docs/widgets/examples.json: every widget's example spec keyed by type, for the
// index's card grid. A separate file so the index HTML stays small and the specs
// load only once a card is in view. Listed in svelte.config.js prerender entries,
// because the crawler never sees a client-side fetch.
import { json } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import { exampleSpec } from '$lib/site/docs/widgets.js';

export const prerender = true;

export const GET = () => json(Object.fromEntries(manifestEntries.map((e) => [e.type, exampleSpec(e)])));
