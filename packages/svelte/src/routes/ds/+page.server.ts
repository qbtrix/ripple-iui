// routes/ds/+page.server.ts — Data for the /ds design system page, built at
// prerender. Atoms: every manifest widget outside the `composite` category (the
// gen UI widgets live on /showcase), in the docs' category order, with its
// first sentence and the spec its docs page previews. Tokens: the colour
// declarations parsed out of ../site.css for both themes, so the swatches and
// their values can't drift from the stylesheet.
import { categoryTitle, orderedEntries, pageSpecs } from '$lib/site/docs/widgets.js';
import siteCss from '../site.css?raw';

/** Colour tokens the page shows, in reading order. */
const COLOURS = [
	['--primary', 'Brand blue: fills, rings, live state'],
	['--primary-ink', 'Brand blue as text'],
	['--paw-crimson', 'Errors and limits only'],
	['--site-ground', 'Page ground'],
	['--site-panel', 'Chat column and panels'],
	['--site-card', 'Response card'],
	['--site-inset', 'Code wells and inset fields'],
	['--card', 'Widget panel'],
	['--site-ink-base', 'Text'],
	['--muted-foreground', 'Widget secondary text'],
	['--border', 'Widget borders']
] as const;

/** `--name: value;` declarations inside the first block whose selector is exactly `selector`. */
function declarations(css: string, selector: string): Map<string, string> {
	const at = css.search(new RegExp(`(^|\\n)${selector.replace('.', '\\.')}\\s*\\{`));
	const out = new Map<string, string>();
	if (at < 0) return out;
	const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
	for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
	return out;
}

export const load = () => {
	const light = declarations(siteCss, ':root');
	const dark = declarations(siteCss, '.dark');
	const tokens = COLOURS.map(([name, use]) => ({
		name,
		use,
		light: light.get(name) ?? null,
		/** What the light swatch paints: the value, or --card when the token is dark-only. */
		lightPaint: light.get(name) ?? light.get('--card') ?? 'transparent',
		dark: dark.get(name) ?? light.get(name) ?? null
	}));
	const radii = ['--radius-control', '--radius-chip', '--radius-card'].map((name) => ({ name, value: light.get(name) ?? '' }));
	const layout = ['--site-gutter', '--site-max', '--site-topbar'].map((name) => ({ name, value: light.get(name) ?? '' }));

	const atoms = orderedEntries()
		.filter((e) => e.category !== 'composite')
		.map((e) => ({
			type: e.type,
			category: e.category,
			description: e.description.split(/(?<=\.)\s/)[0],
			spec: pageSpecs(e).example
		}));
	const categories = [...new Set(atoms.map((a) => a.category))].map((id) => ({ id, title: categoryTitle(id) }));
	return { tokens, radii, layout, atoms, categories };
};
