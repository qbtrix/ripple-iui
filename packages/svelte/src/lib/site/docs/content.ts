// site/docs/content.ts — The docs page index and everything derived from it:
// sidebar nav, prev/next, and the llms.txt family. Pages are the .md files
// under src/docs, read at build time with import.meta.glob; sections and their
// order come from src/docs/_nav.ts, page order from frontmatter `order`. The
// pure builders take a page list so tests can feed fixtures.

import { sections } from '../../../docs/_nav.js';
import { parseFrontmatter, toPlainMarkdown, type DocMeta } from './markdown.js';
import { SITE_URL, SLIM_MANIFEST_URL } from './model.js';

export interface DocPage extends DocMeta {
	/** e.g. `getting-started/install` */
	slug: string;
	section: string;
	/** Repo-relative path, for build errors. */
	file: string;
	raw: string;
}
export interface NavSection {
	title: string;
	pages: { slug: string; title: string }[];
}

const files = import.meta.glob('/src/docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;

/** Order pages by nav section, then frontmatter order. Pages outside a nav section are left out. */
export function indexPages(
	sources: Record<string, string>,
	navSections: { title: string; dir: string }[] = sections
): DocPage[] {
	const pages: DocPage[] = [];
	for (const section of navSections) {
		const inSection: DocPage[] = [];
		for (const [path, raw] of Object.entries(sources)) {
			const slug = path.replace(/^\/src\/docs\//, '').replace(/\.md$/, '');
			if (!slug.startsWith(`${section.dir}/`)) continue;
			const file = `packages/svelte${path}`;
			inSection.push({ ...parseFrontmatter(raw, file).meta, slug, section: section.title, file, raw });
		}
		pages.push(...inSection.toSorted((a, b) => a.order - b.order || a.slug.localeCompare(b.slug)));
	}
	return pages;
}

export const pages: DocPage[] = indexPages(files);

export function buildNav(list: DocPage[] = pages): NavSection[] {
	const out: NavSection[] = [];
	for (const p of list) {
		let s = out.at(-1);
		if (s?.title !== p.section) out.push((s = { title: p.section, pages: [] }));
		s.pages.push({ slug: p.slug, title: p.title });
	}
	return out;
}

const link = (p?: DocPage) => (p ? { slug: p.slug, title: p.title } : null);

export function prevNext(slug: string, list: DocPage[] = pages) {
	const i = list.findIndex((p) => p.slug === slug);
	return { prev: i > 0 ? link(list[i - 1]) : null, next: i >= 0 ? link(list[i + 1]) : null };
}

const mdUrl = (p: DocPage) => `${SITE_URL}/docs/${p.slug}.md`;

/** llmstxt.org index: title, summary, then one linked line per page under its section. */
export function llmsTxt(list: DocPage[] = pages): string {
	let out =
		'# Ripple\n\n> Ripple renders a JSON UI spec, written by a model, as a live Svelte 5 interface. ' +
		'It can render while the spec is still streaming.\n\n' +
		`Full docs in one file: ${SITE_URL}/llms-full.txt. Widget catalog for agents: ${SLIM_MANIFEST_URL}\n`;
	let section = '';
	for (const p of list) {
		if (p.section !== section) out += `\n## ${(section = p.section)}\n\n`;
		out += `- [${p.title}](${mdUrl(p)}): ${p.description}\n`;
	}
	return out;
}

/** Every docs page's markdown, in nav order. */
export function llmsFullTxt(list: DocPage[] = pages): string {
	return list.map((p) => toPlainMarkdown(p.raw, p.file)).join('\n---\n\n');
}

/** Getting-started pages plus where to find the widget catalog. */
export function llmsSmallTxt(list: DocPage[] = pages): string {
	const start = list.filter((p) => p.slug.startsWith('getting-started/'));
	return (
		start.map((p) => toPlainMarkdown(p.raw, p.file)).join('\n---\n\n') +
		'\n---\n\n# Widget catalog\n\n' +
		`Slim manifest (core widgets and actions, newest release): ${SLIM_MANIFEST_URL}\n` +
		`Full manifest (every widget with prop schemas and examples): ${SITE_URL}/manifest.json\n`
	);
}
