// routes/showcase/[moved]/+page.ts — The old /showcase/<name> URLs of pages that
// moved to /ds. Static routes win over this one, so it only answers the names
// in MOVED_TO_DS; anything else is a 404. Prerendered (entries), so the static
// build writes one small redirect page per old URL.
import { error } from '@sveltejs/kit';

const MOVED_TO_DS = [
	'ai',
	'button',
	'call',
	'card',
	'checkbox-group',
	'data-kit',
	'feature',
	'marketing',
	'motion',
	'moving-indicator',
	'premium',
	'shell',
	'spec',
	'stat'
];

export const entries = () => MOVED_TO_DS.map((moved) => ({ moved }));

export const load = ({ params }) => {
	if (!MOVED_TO_DS.includes(params.moved)) error(404, 'Not found');
	return { to: `/ds/${params.moved}` };
};
