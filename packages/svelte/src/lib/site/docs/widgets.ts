// site/docs/widgets.ts — The generated widget reference under /docs/widgets:
// categories, per-widget page data, the raw .md for each widget and its lines
// in the llms.txt family. Everything comes from the widget manifest; nothing
// here is hand-written per widget. Server and test only: it imports every
// manifest entry, so keep it out of client code (load it from +page.server.ts).
// The pure builders take an entry list so tests can feed fixtures.

import { manifestEntries, type WidgetManifestEntry, type WidgetPropSpec } from '../../manifest/index.js';
import { SITE_URL } from './model.js';
import { objectFields } from './props.js';

export const SPEC_VERSION = '1.0';
const REPO_WIDGETS = 'https://github.com/qbtrix/ripple-iui/tree/main/packages/svelte/src/lib/widgets';

/** Category id and title, in reading order. A category not listed here sorts last under its id. */
export const CATEGORIES: { id: string; title: string }[] = [
	{ id: 'display', title: 'Display' },
	{ id: 'layout', title: 'Layout' },
	{ id: 'input', title: 'Input' },
	{ id: 'data', title: 'Data' },
	{ id: 'control', title: 'Control flow' },
	{ id: 'overlay', title: 'Overlay' },
	{ id: 'composite', title: 'Composite' },
	{ id: 'interactive', title: 'Interactive' },
	{ id: 'media', title: 'Media' },
	{ id: 'ai', title: 'AI' },
	{ id: 'research', title: 'Research' },
	{ id: 'marketing', title: 'Marketing' },
	{ id: 'vertical', title: 'Vertical' }
];

export interface WidgetCategory {
	id: string;
	title: string;
	widgets: { type: string; description: string }[];
}
export interface PropRow extends WidgetPropSpec {
	name: string;
}
export interface NamedSpec {
	name: string;
	description?: string;
	spec: Record<string, unknown>;
}

const order = (id: string) => {
	const i = CATEGORIES.findIndex((c) => c.id === id);
	return i < 0 ? CATEGORIES.length : i;
};
export const categoryTitle = (id: string) => CATEGORIES.find((c) => c.id === id)?.title ?? id;

/** Categories in reading order, each with its widgets sorted by type. */
export function widgetCategories(list: WidgetManifestEntry[] = manifestEntries): WidgetCategory[] {
	const ids = [...new Set(list.map((e) => e.category))].toSorted((a, b) => order(a) - order(b) || a.localeCompare(b));
	return ids.map((id) => ({
		id,
		title: categoryTitle(id),
		widgets: list
			.filter((e) => e.category === id)
			.map((e) => ({ type: e.type, description: e.description }))
			.toSorted((a, b) => a.type.localeCompare(b.type))
	}));
}

/** Every entry in page order: category order, then type. */
export function orderedEntries(list: WidgetManifestEntry[] = manifestEntries): WidgetManifestEntry[] {
	return list.toSorted((a, b) => order(a.category) - order(b.category) || a.category.localeCompare(b.category) || a.type.localeCompare(b.type));
}

/** Previous and next widget within the same category. */
export function widgetPrevNext(type: string, list: WidgetManifestEntry[] = manifestEntries) {
	const entry = list.find((e) => e.type === type);
	const sibs = orderedEntries(list.filter((e) => e.category === entry?.category));
	const i = sibs.findIndex((e) => e.type === type);
	return { prev: i > 0 ? sibs[i - 1].type : null, next: i >= 0 ? (sibs[i + 1]?.type ?? null) : null };
}

/** The entry's `example` node wrapped in the smallest valid spec. */
export const exampleSpec = (e: WidgetManifestEntry): Record<string, unknown> => ({ version: SPEC_VERSION, ui: e.example });

/** `pocket` / `pockets` as one list of runnable specs (empty when the entry has neither). */
export function interactiveSpecs(e: WidgetManifestEntry): NamedSpec[] {
	const pockets = e.pockets ?? (e.pocket ? [{ name: 'Interactive example', ...e.pocket }] : []);
	return pockets.map(({ name, description, state, ui }) => ({
		name,
		description,
		spec: { version: SPEC_VERSION, ...(state && { state }), ui }
	}));
}

/**
 * Widgets whose bare example renders nothing: `each` reads state a lone node
 * cannot carry, and the overlays are shown closed (manifest tests pin
 * example.type, and an open one would cover the page on load). widgets.test.ts
 * fails if one of these starts rendering or another one stops.
 */
export const EMPTY_EXAMPLES = new Set(['each', 'coachmark', 'command-palette', 'confirm-dialog', 'modal', 'sheet']);

/** What a widget page previews: the example, or the first pocket when the example renders empty (then not repeated below). */
export function pageSpecs(e: WidgetManifestEntry): { example: Record<string, unknown>; interactive: NamedSpec[] } {
	const interactive = interactiveSpecs(e);
	if (!EMPTY_EXAMPLES.has(e.type) || !interactive.length) return { example: exampleSpec(e), interactive };
	return { example: interactive[0].spec, interactive: interactive.slice(1) };
}

export const rows = (r?: Record<string, WidgetPropSpec>): PropRow[] =>
	Object.entries(r ?? {}).map(([name, spec]) => ({ name, ...spec }));

export interface AnatomyPart {
	name: string;
	/** Where the part lives on the node: a node-level field, a structured prop, or `children`. */
	kind: 'node field' | 'prop' | 'children';
	/** The part's own fields (object props) or the node types it holds (children). */
	parts: string[];
	/** It holds a list: an array prop, or children. */
	many: boolean;
	description: string;
}

const isList = (type: string) => /^Array<|\[\]$/.test(type.trim());
const nodeType = (n: unknown) =>
	n && typeof n === 'object' && typeof (n as { type?: unknown }).type === 'string' ? (n as { type: string }).type : null;

/**
 * The parts a composite widget is assembled from, all read from its manifest
 * entry: its node fields, every prop that takes structured content (an object,
 * an array of objects, or a nested spec), and the node types its example puts
 * in `children`.
 */
export function anatomy(e: WidgetManifestEntry): AnatomyPart[] {
	const fields = rows(e.nodeFields).map((r) => ({
		name: r.name,
		kind: 'node field' as const,
		parts: objectFields(r.type).map((f) => f.name + (f.optional ? '?' : '')),
		many: isList(r.type),
		description: r.description
	}));
	const props = rows(e.props).flatMap((r) => {
		const parts = objectFields(r.type).map((f) => f.name + (f.optional ? '?' : ''));
		return parts.length || /\bUISpec\b/.test(r.type)
			? [{ name: r.name, kind: 'prop' as const, parts, many: isList(r.type), description: r.description }]
			: [];
	});
	const kids = Array.isArray(e.example.children) ? e.example.children.map(nodeType).filter((t) => t !== null) : [];
	const children = kids.length
		? [
				{
					name: 'children',
					kind: 'children' as const,
					parts: [...new Set(kids)],
					many: true,
					description: 'Child nodes. The example nests these types.'
				}
			]
		: [];
	return [...fields, ...props, ...children];
}

const sources = Object.keys(import.meta.glob('/src/lib/widgets/**/*.svelte'));
const pascal = (type: string) => type.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

/** The widget's .svelte file on GitHub when exactly one file matches its type name, else the widgets folder. */
export function sourceUrl(type: string, files: string[] = sources): string {
	const hits = files.filter((f) => f.endsWith(`/${pascal(type)}.svelte`));
	return hits.length === 1 ? `${REPO_WIDGETS}/${hits[0].replace('/src/lib/widgets/', '')}` : REPO_WIDGETS;
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function table(title: string, list: PropRow[]): string {
	if (!list.length) return '';
	return (
		`## ${title}\n\n| Name | Type | Required | Description |\n| --- | --- | --- | --- |\n` +
		list.map((r) => `| \`${r.name}\` | \`${cell(r.type)}\` | ${r.required ? 'yes' : 'no'} | ${cell(r.description)} |`).join('\n') +
		'\n\n'
	);
}

const json = (v: unknown) => '```json\n' + JSON.stringify(v, null, 2) + '\n```\n\n';

/** /docs/widgets/<type>.md: the page as markdown, for people and models. */
export function widgetMarkdown(e: WidgetManifestEntry): string {
	let out = `# ${e.type}\n\n${e.description}\n\nCategory: ${categoryTitle(e.category)}.`;
	if (e.staticSafe) out += ' Renders without JavaScript.';
	out += `\n\n## Example\n\n${json(exampleSpec(e))}`;
	for (const s of interactiveSpecs(e)) {
		out += `## ${s.name}\n\n${s.description ? `${s.description}\n\n` : ''}${json(s.spec)}`;
	}
	out += table('Props', rows(e.props)) + table('Events', rows(e.events)) + table('Node fields', rows(e.nodeFields));
	return out.trimEnd() + '\n';
}

/** The "Widgets" section of /llms.txt: one linked line per widget. */
export function widgetsLlmsTxt(list: WidgetManifestEntry[] = manifestEntries): string {
	return (
		'\n## Widgets\n\n' +
		orderedEntries(list)
			.map((e) => `- [${e.type}](${SITE_URL}/docs/widgets/${e.type}.md): ${e.description}`)
			.join('\n') +
		'\n'
	);
}

const sig = (r: PropRow) => `${r.name}${r.required ? '' : '?'}: ${r.type}`;

/** The widget section of /llms-full.txt: per widget, its description and a one-line props and events summary. */
export function widgetsLlmsFullTxt(list: WidgetManifestEntry[] = manifestEntries): string {
	return (
		'# Widgets\n\nEvery widget type, with its props (`?` marks optional). Full schemas and examples: ' +
		`${SITE_URL}/docs/widgets\n\n` +
		orderedEntries(list)
			.map((e) => {
				let s = `## ${e.type}\n\n${e.description}\n\nProps: ${rows(e.props).map(sig).join(', ') || 'none'}\n`;
				if (e.events) s += `Events: ${rows(e.events).map(sig).join(', ')}\n`;
				if (e.nodeFields) s += `Node fields: ${rows(e.nodeFields).map(sig).join(', ')}\n`;
				return s;
			})
			.join('\n')
	);
}
