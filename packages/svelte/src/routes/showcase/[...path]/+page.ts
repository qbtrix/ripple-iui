// routes/showcase/[...path]/+page.ts — Every old /showcase URL, now a redirect.
// /showcase goes to /live (the one gallery), /showcase/<id> to the item it
// showed, opened in place (/live?s=demo-<id>), and the names that moved to the
// design system to /ds/<name>. Anything else is a 404. Prerendered (entries),
// so the static build writes one small redirect page per old URL.
import { error } from '@sveltejs/kit';
import { demoItems } from '../../live/gallery.js';

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

const target = (path: string) => {
	if (path === '') return '/live';
	if (MOVED_TO_DS.includes(path)) return `/ds/${path}`;
	return demoItems.find((i) => i.id === path)?.href;
};

export const entries = () => ['', ...MOVED_TO_DS, ...demoItems.map((i) => i.id)].map((path) => ({ path }));

export const load = ({ params }: { params: { path: string } }) => {
	const to = target(params.path);
	if (!to) error(404, 'Not found');
	return { to };
};
