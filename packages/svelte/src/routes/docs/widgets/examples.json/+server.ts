// /docs/widgets/examples.json: one spec per widget type, for the index's card
// grid. A separate file so the index HTML stays small and the specs load only
// once a card is in view. Listed in svelte.config.js prerender entries, because
// the crawler never sees a client-side fetch. Overlays and control-flow nodes
// render nothing in place from their bare example (a closed modal, an `if` with
// no state), so for those the card shows the first interactive spec when there
// is one: the trigger, or the node with its state.
import { json } from '@sveltejs/kit';
import { manifestEntries } from '$lib/manifest/index.js';
import { exampleSpec, interactiveSpecs } from '$lib/site/docs/widgets.js';

export const prerender = true;

const IN_PLACE_EMPTY = new Set(['overlay', 'control']);

export const GET = () =>
	json(
		Object.fromEntries(
			manifestEntries.map((e) => [
				e.type,
				(IN_PLACE_EMPTY.has(e.category) && interactiveSpecs(e)[0]?.spec) || exampleSpec(e)
			])
		)
	);
