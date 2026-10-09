// site/landing/data.ts — Everything the landing shows below the hero that
// comes from the repo rather than from copy: the widget catalog and the four
// mini-render specs (the manifest, as /docs/widgets uses it), the integration
// code (fenced blocks lifted from the docs markdown, so the homepage can't
// drift from the pages it links), and the measured numbers (first-widget time
// over the /live recordings). IO-backed inputs (git tags, bundle sizes) are
// passed in by routes/+page.server.ts so this stays pure and testable.
// Server and test only: it imports the whole manifest and every doc page.

import { manifestEntries } from '../../manifest/index.js';
import { parsePartialSpec } from '../../streaming/json-parse.js';
import { pages } from '../docs/content.js';
import { exampleSpec, interactiveSpecs, widgetCategories } from '../docs/widgets.js';
import { scenarios } from '../../../routes/live/scenarios.js';

/**
 * Widgets shown live above the catalog list, in order. None of them pulls a
 * heavy chunk on mount (the ECharts-backed ones add about 360 kB gzipped).
 */
export const MINI_TYPES = ['approval-gate', 'todo-list', 'data-grid', 'flashcard'];

export interface CodeFile {
	/** File name or label shown above the block, e.g. `src/app.css`. */
	name: string;
	lang: string;
	code: string;
}
export interface Release {
	tag: string;
	date: string;
	note: string;
	url: string;
}
export interface CoreSizes {
	/** `@ripple-ui/core/headless`, min+gzip bytes. */
	headless: number;
	/** `@ripple-ui/core/headless/slim`, min+gzip bytes. */
	slim: number;
}

/**
 * The first fenced block on doc page `slug` whose body contains `marker`.
 * Throws when there is none: a docs edit that drops the block must fail the
 * build, not ship an empty code box.
 */
export function docFence(slug: string, marker: string, list = pages): { lang: string; code: string } {
	const page = list.find((p) => p.slug === slug);
	if (!page) throw new Error(`landing: no doc page ${slug}`);
	// A Windows checkout can hand the markdown over with CRLF line ends.
	for (const m of page.raw.replaceAll('\r\n', '\n').matchAll(/^```(\w*)\n([\s\S]*?)^```/gm)) {
		if (m[2].includes(marker)) return { lang: m[1], code: m[2].trimEnd() };
	}
	throw new Error(`landing: no code block containing "${marker}" in src/docs/${slug}.md`);
}

/** A block whose first line is a `// path` or `/* path *\/` comment: that path as its name, the rest as code. */
function named(block: { lang: string; code: string }, fallback: string): CodeFile {
	const [first, ...rest] = block.code.split('\n');
	const path = first.match(/^(?:\/\/|\/\*)\s*(\S+\.\w+)\s*(?:\*\/)?$/)?.[1];
	return path ? { name: path, lang: block.lang, code: rest.join('\n') } : { name: fallback, lang: block.lang, code: block.code };
}

/** The two integration tabs, from getting-started/* and concepts/headless. */
export function integration(list = pages) {
	const f = (slug: string, marker: string) => docFence(slug, marker, list);
	return [
		{
			id: 'sveltekit',
			label: 'SvelteKit',
			docs: [
				{ href: '/docs/getting-started/install', title: 'Install' },
				{ href: '/docs/getting-started/stream-a-spec', title: 'Stream a spec' }
			],
			files: [
				named(f('getting-started/install', 'bun add @ripple-ui/svelte'), 'Terminal'),
				named(f('getting-started/install', '@ripple-ui/svelte/styles.css'), 'app.css'),
				named(f('getting-started/stream-a-spec', 'POST: RequestHandler'), '+server.ts'),
				named(f('getting-started/stream-a-spec', 'streamSpec(res.body'), 'src/routes/+page.svelte')
			]
		},
		{
			id: 'headless',
			label: 'Any framework',
			note: 'The headless runtime takes a whole spec. It has no stream parser of its own (that ships in the Svelte package), so read the response to the end, then pass the spec in.',
			docs: [{ href: '/docs/concepts/headless', title: 'Headless runtime' }],
			files: [
				named(f('concepts/headless', 'npm install @ripple-ui/core'), 'Terminal'),
				named(f('concepts/headless', "rt.findById('label')"), 'Run a spec'),
				named(f('concepts/headless', 'function Node('), 'Draw the tree with your components')
			]
		}
	];
}

type Node = { type?: unknown; children?: unknown };

function hasKnownWidget(node: unknown, known: Set<string>): boolean {
	if (Array.isArray(node)) return node.some((n) => hasKnownWidget(n, known));
	if (!node || typeof node !== 'object') return false;
	const n = node as Node;
	return (typeof n.type === 'string' && known.has(n.type)) || hasKnownWidget(n.children, known);
}

/**
 * ms from a recording's first chunk to the chunk after which the partial
 * spec's `ui` tree first holds a catalog widget: the earliest moment
 * <Ripple> can draw one. null when the recording never gets there.
 */
export function firstWidgetMs(chunks: readonly { t: number; text: string }[], known: Set<string>): number | null {
	let text = '';
	for (let i = 0; i < chunks.length; i++) {
		text += chunks[i].text;
		// Chunks sharing a timestamp land together; parse once per arrival time.
		if (chunks[i + 1]?.t === chunks[i].t) continue;
		const spec = parsePartialSpec(text).value as { ui?: unknown } | null;
		if (spec && hasKnownWidget(spec.ui, known)) return chunks[i].t;
	}
	return null;
}

export function median(xs: number[]): number {
	const s = xs.toSorted((a, b) => a - b);
	const mid = s.length >> 1;
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * A release line from `git for-each-ref` (tag, date, subject, tab-separated).
 * The subject drops its leading "ripple v0.8.0:" or "v0.7.0 —"; any dash left
 * becomes a comma. null when nothing but the version remains.
 */
export function parseRelease(line: string, repo: string): Release | null {
	const [tag, date, subject = ''] = line.split('\t');
	if (!tag || !date) return null;
	const note = subject
		.replace(/^(?:ripple\s+)?v?\d+\.\d+\.\d+\s*[:—–-]?\s*/i, '')
		.replace(/\s*[—–]\s*/g, ', ')
		.trim();
	if (!note) return null;
	// GitHub serves /releases/tag/<tag> for a bare tag too.
	return { tag, date, note: note[0].toUpperCase() + note.slice(1), url: `${repo}/releases/tag/${tag}` };
}

export interface LandingInputs {
	releases: Release[];
	sizes: CoreSizes | null;
}

/** The landing's data below the hero; IO-backed inputs come in from the caller. */
export function buildLandingData({ releases, sizes }: LandingInputs) {
	const known = new Set(manifestEntries.map((e) => e.type));
	const minis = MINI_TYPES.map((type) => {
		const e = manifestEntries.find((x) => x.type === type);
		if (!e) throw new Error(`landing: ${type} is not in the widget manifest`);
		// Descriptions mark code with backticks; the landing shows them as plain text.
		return { type, description: e.description.replaceAll('`', ''), spec: interactiveSpecs(e)[0]?.spec ?? exampleSpec(e) };
	});
	const recorded = scenarios
		.map((s) => ({ model: s.fixture.model, ms: firstWidgetMs(s.fixture.chunks, known), doneMs: s.fixture.chunks.at(-1)?.t ?? 0 }))
		.filter((r): r is { model: string; ms: number; doneMs: number } => r.ms !== null);

	return {
		widgetCount: manifestEntries.length,
		categories: widgetCategories().map((c) => ({ id: c.id, title: c.title, types: c.widgets.map((w) => w.type) })),
		minis,
		firstWidget: recorded.length
			? {
					medianMs: median(recorded.map((r) => r.ms)),
					/** Median time to the last chunk: the whole spec. */
					medianDoneMs: median(recorded.map((r) => r.doneMs)),
					n: recorded.length,
					models: [...new Set(recorded.map((r) => r.model))]
				}
			: null,
		sizes,
		integration: integration(),
		releases
	};
}

export type LandingData = ReturnType<typeof buildLandingData>;
