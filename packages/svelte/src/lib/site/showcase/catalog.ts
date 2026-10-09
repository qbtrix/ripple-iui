// site/showcase/catalog.ts — What /showcase lists and how it filters. Four
// disjoint facets: Apps (the hand-built sub-pages under /showcase/<slug>),
// Widgets (manifest entries outside the composite category), Patterns (the
// composite entries: whole-page layouts like dashboards, forms and wizards)
// and Flows (flows.ts). Widget and pattern items are built on the server from
// the manifest (+page.server.ts), so this module stays client-safe and holds
// only the pure parts: the apps list, facet counts, the filter and the
// ?f=&c=&q= URL state.

export type Facet = 'apps' | 'widgets' | 'patterns' | 'flows';

export const FACETS: { id: Facet; title: string }[] = [
	{ id: 'apps', title: 'Apps' },
	{ id: 'widgets', title: 'Widgets' },
	{ id: 'patterns', title: 'Patterns' },
	{ id: 'flows', title: 'Flows' }
];
export const DEFAULT_FACET: Facet = 'apps';

/** One card on the index. `category` is the chip a widget filters by and the label every card shows. */
export interface ShowcaseItem {
	id: string;
	facet: Facet;
	title: string;
	line: string;
	category: string;
	href: string;
}

export interface ShowcaseApp {
	slug: string;
	title: string;
	line: string;
	category: 'App' | 'Widget pack' | 'Components';
}

/** The sub-pages, best first. Each card renders the page itself, scaled down. */
export const APPS: ShowcaseApp[] = [
	{ slug: 'classic', title: 'Classic pockets', line: 'Research, markets, weather, travel and code answers, each one spec.', category: 'App' },
	{ slug: 'marketing', title: 'Solar landing page', line: 'A full marketing page for a fictional solar installer, from the marketing pack.', category: 'App' },
	{ slug: 'mission-control', title: 'Mission control', line: 'An instrument panel with its own dark theme, built from telemetry widgets.', category: 'App' },
	{ slug: 'exec-dashboard', title: 'Executive dashboard', line: 'Revenue, segments and pipeline, with the date range owned by the host page.', category: 'App' },
	{ slug: 'ai', title: 'AI display tier', line: 'Streaming text, tool calls, reasoning traces and approval gates.', category: 'Widget pack' },
	{ slug: 'motion', title: 'Motion', line: 'Staggered reveals, spring hover, parallax and the animate action.', category: 'Widget pack' },
	{ slug: 'premium', title: 'Premium pack', line: 'Glass cards, beams, marquees and text effects.', category: 'Widget pack' },
	{ slug: 'spec', title: 'KPI cards', line: 'A KPI row and metric cards, each a small spec.', category: 'Widget pack' },
	{ slug: 'flow', title: 'Flow actions', line: 'Validate, confirm, branch and chained API calls against a mocked host.', category: 'Widget pack' },
	{ slug: 'checkbox-group', title: 'Checkbox group', line: 'A highlight that glides between rows and merges checked ones.', category: 'Components' },
	{ slug: 'moving-indicator', title: 'Moving indicator', line: 'One sliding indicator shared by tabs, segmented controls and lists.', category: 'Components' },
	{ slug: 'shell', title: 'Shell primitives', line: 'Sidebar rows, section headers, panel headers and key hints.', category: 'Components' },
	{ slug: 'feature', title: 'Feature page parts', line: 'Page headers, empty states, inline alerts and form fields.', category: 'Components' },
	{ slug: 'call', title: 'Call parts', line: 'Control bars, participant tiles, a floating dock and an incoming call card.', category: 'Components' },
	{ slug: 'card', title: 'Card', line: 'Every card variant, density and slot.', category: 'Components' },
	{ slug: 'stat', title: 'Stat', line: 'Stat tiles with deltas, trends and sparklines.', category: 'Components' },
	{ slug: 'button', title: 'Button', line: 'Variants, sizes, icons and the loading state.', category: 'Components' }
];

export const appItems = (apps: ShowcaseApp[] = APPS): ShowcaseItem[] =>
	apps.map((a) => ({ id: a.slug, facet: 'apps', title: a.title, line: a.line, category: a.category, href: `/showcase/${a.slug}` }));

/** 'checkbox-group' -> 'Checkbox group'. */
export const widgetTitle = (type: string) => type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');

export interface ShowcaseState {
	f: Facet;
	c: string;
	q: string;
}

const isFacet = (v: string | null): v is Facet => FACETS.some((x) => x.id === v);

/** ?f=widgets&c=data&q=chart -> state. Unknown facets fall back to the default; c only applies to widgets. */
export function parseState(search: string): ShowcaseState {
	const p = new URLSearchParams(search);
	const f = p.get('f');
	const facet = isFacet(f) ? f : DEFAULT_FACET;
	return { f: facet, c: facet === 'widgets' ? (p.get('c') ?? '').trim() : '', q: (p.get('q') ?? '').slice(0, 100) };
}

/** State -> '?f=..' (defaults omitted, '' when everything is default). */
export function toSearch(s: ShowcaseState): string {
	const p = new URLSearchParams();
	if (s.f !== DEFAULT_FACET) p.set('f', s.f);
	if (s.f === 'widgets' && s.c) p.set('c', s.c);
	if (s.q.trim()) p.set('q', s.q.trim());
	const out = p.toString();
	return out ? `?${out}` : '';
}

/** Case-insensitive match on title, id and category; every word must hit. */
export function matches(item: ShowcaseItem, q: string): boolean {
	const words = q.toLowerCase().split(/\s+/).filter(Boolean);
	const hay = `${item.title} ${item.id} ${item.category}`.toLowerCase();
	return words.every((w) => hay.includes(w));
}

/** Items in the state's facet (and widget category) that match the query, in list order. */
export const filterItems = (items: ShowcaseItem[], s: ShowcaseState): ShowcaseItem[] =>
	items.filter((i) => i.facet === s.f && (!s.c || i.category === s.c) && matches(i, s.q));

/** How many items each facet would show for this query (the chip counts). */
export function facetCounts(items: ShowcaseItem[], q: string): Record<Facet, number> {
	const out: Record<Facet, number> = { apps: 0, widgets: 0, patterns: 0, flows: 0 };
	for (const i of items) if (matches(i, q)) out[i.facet]++;
	return out;
}

/** Widget categories with counts for the query, in the order given (the docs' category order). */
export function categoryCounts(items: ShowcaseItem[], q: string, order: string[]): { id: string; count: number }[] {
	const widgets = items.filter((i) => i.facet === 'widgets' && matches(i, q));
	return order.map((id) => ({ id, count: widgets.filter((i) => i.category === id).length })).filter((c) => c.count > 0);
}
