// content.test.ts — Docs index, sidebar nav, prev/next and the llms files,
// over fixtures and over the real src/docs pages.
import { describe, expect, it } from 'vitest';
import { buildNav, indexPages, llmsFullTxt, llmsSmallTxt, llmsTxt, pages, prevNext } from './content.js';
import { renderDoc } from './markdown.js';
import { orderedEntries } from './widgets.js';
import { forYourModel, SLIM_MANIFEST_URL } from './model.js';

const page = (title: string, order: number) =>
	`---\ntitle: ${title}\ndescription: About ${title}\norder: ${order}\n---\n\n${title} body\n`;
const fixture = indexPages(
	{
		'/src/docs/start/b.md': page('B', 2),
		'/src/docs/start/a.md': page('A', 1),
		'/src/docs/guides/c.md': page('C', 1),
		'/src/docs/orphan/d.md': page('D', 1)
	},
	[
		{ title: 'Start', dir: 'start' },
		{ title: 'Guides', dir: 'guides' },
		{ title: 'Empty', dir: 'empty' }
	]
);

describe('index and nav', () => {
	it('orders by section then frontmatter order, dropping pages outside a section', () => {
		expect(fixture.map((p) => p.slug)).toEqual(['start/a', 'start/b', 'guides/c']);
	});
	it('drops sections with no pages', () => {
		expect(buildNav(fixture)).toEqual([
			{
				title: 'Start',
				pages: [
					{ slug: 'start/a', title: 'A' },
					{ slug: 'start/b', title: 'B' }
				]
			},
			{ title: 'Guides', pages: [{ slug: 'guides/c', title: 'C' }] }
		]);
	});
	it('links prev/next across sections, with none at the ends', () => {
		expect(prevNext('start/a', fixture)).toEqual({ prev: null, next: { slug: 'start/b', title: 'B' } });
		expect(prevNext('start/b', fixture)).toEqual({
			prev: { slug: 'start/a', title: 'A' },
			next: { slug: 'guides/c', title: 'C' }
		});
		expect(prevNext('guides/c', fixture).next).toBeNull();
	});
});

describe('llms files', () => {
	it('llms.txt lists every page under its section with a .md link', () => {
		const txt = llmsTxt(fixture);
		expect(txt).toMatch(/^# Ripple\n\n> /);
		expect(txt).toContain('## Start\n\n- [A](https://ripple.pocketpaw.xyz/docs/start/a.md): About A\n');
		expect(txt).toContain('## Guides\n\n- [C](');
	});
	it('llms-full.txt holds every page, titled', () => {
		const txt = llmsFullTxt(fixture);
		for (const t of ['A', 'B', 'C']) expect(txt).toContain(`# ${t}\n\n> About ${t}\n\n${t} body`);
	});
	it('llms-small.txt is getting-started plus the manifest pointers', () => {
		const txt = llmsSmallTxt(pages);
		const start = pages.filter((p) => p.slug.startsWith('getting-started/'));
		for (const doc of start) expect(txt).toContain(`# ${doc.title}\n`);
		expect(txt).toContain(SLIM_MANIFEST_URL);
		expect(txt).toContain('https://ripple.pocketpaw.xyz/manifest.json');
	});
	it('"Copy for your model" appends the slim manifest URL', () => {
		expect(forYourModel('# X\n\n')).toBe(`# X\n\nRipple widget catalog (slim manifest): ${SLIM_MANIFEST_URL}\n`);
	});
});

describe('the real docs', () => {
	it('has every section in nav order, all in llms.txt and llms-full.txt', () => {
		expect(pages.map((p) => p.slug)).toEqual([
			'getting-started/install',
			'getting-started/render-a-spec',
			'getting-started/stream-a-spec',
			'concepts/the-spec',
			'concepts/state-and-expressions',
			'concepts/actions-and-events',
			'concepts/flow-actions',
			'concepts/streaming',
			'concepts/headless',
			'concepts/security',
			'concepts/catalog-and-validation',
			'guides/custom-widgets',
			'guides/theming',
			'guides/intents',
			'guides/sveltekit',
			'guides/prompting',
			'guides/claude-api',
			'guides/openai',
			'guides/any-model',
			'guides/layout-gotchas',
			'api/core',
			'api/svelte',
			'architecture/overview'
		]);
		expect(buildNav().map((s) => s.title)).toEqual([
			'Getting started',
			'Concepts',
			'Guides',
			'API reference',
			'Architecture'
		]);
		const full = llmsFullTxt();
		const index = llmsTxt();
		for (const p of pages) {
			expect(full).toContain(`# ${p.title}\n`);
			expect(index).toContain(`/docs/${p.slug}.md`);
		}
	});
});

// Prose only: frontmatter and body with fenced blocks and inline code removed,
// so code samples may use any characters.
const prose = (raw: string) =>
	raw
		.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*\r?$/gm, '')
		.replace(/`[^`\n]*`/g, '');

describe('docs hygiene', () => {
	const docSlugs = new Set(pages.map((p) => p.slug));
	const widgetTypes = new Set(orderedEntries().map((e) => e.type));
	const anchors = new Map(pages.map((p) => [p.slug, new Set(renderDoc(p.raw, p.file).headings.map((h) => h.id))]));

	it('every sidebar entry is a real page', () => {
		for (const s of buildNav()) for (const p of s.pages) expect(docSlugs.has(p.slug), p.slug).toBe(true);
	});

	it.each(pages)('$slug links only to /docs routes that exist', (p) => {
		for (const [, target] of p.raw.matchAll(/\]\((\/docs[^)\s]*)\)/g)) {
			const [path, hash] = target.replace(/\.md$/, '').split('#');
			const slug = path.replace(/^\/docs\/?/, '');
			const ok =
				docSlugs.has(slug) || slug === 'widgets' || (slug.startsWith('widgets/') && widgetTypes.has(slug.slice(8)));
			expect(ok, `${p.file}: ${target}`).toBe(true);
			if (hash && docSlugs.has(slug)) expect(anchors.get(slug)?.has(hash), `${p.file}: ${target}`).toBe(true);
		}
	});

	it.each(pages)('$slug points at no internal-only docs', (p) => {
		expect(p.raw).not.toMatch(/docs\/(wiki|plans|design|kb|c4)\b|superpowers/);
	});

	it.each(pages)('$slug prose has no em or en dashes, emoji, or hype words', (p) => {
		const text = prose(p.raw);
		expect(text, p.file).not.toMatch(/[\u2013\u2014]/);
		expect(text, p.file).not.toMatch(/\p{Extended_Pictographic}/u);
		expect(text, p.file).not.toMatch(/\b(supercharge|unleash|seamless(ly)?|effortless(ly)?|magic(al)?|next-generation)\b/i);
	});

	it('the prose filter strips code but keeps text', () => {
		expect(prose('a \u2014 b\n```js\nx \u2014 y\n```\n`c \u2014 d` e')).toBe('a \u2014 b\n\n e');
	});
});
