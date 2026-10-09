// content.test.ts — Docs index, sidebar nav, prev/next and the llms files,
// over fixtures and over the real src/docs pages.
import { describe, expect, it } from 'vitest';
import { buildNav, indexPages, llmsFullTxt, llmsSmallTxt, llmsTxt, pages, prevNext } from './content.js';
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
	it('has the getting-started and guides pages in order, all in llms.txt and llms-full.txt', () => {
		expect(pages.map((p) => p.slug)).toEqual([
			'getting-started/install',
			'getting-started/render-a-spec',
			'getting-started/stream-a-spec',
			'guides/layout-gotchas'
		]);
		const full = llmsFullTxt();
		const index = llmsTxt();
		for (const p of pages) {
			expect(full).toContain(`# ${p.title}\n`);
			expect(index).toContain(`/docs/${p.slug}.md`);
		}
	});
});
