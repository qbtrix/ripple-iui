// markdown.test.ts — The docs markdown pipeline: frontmatter, heading ids and
// the outline, the JSON tokenizer, and ```ripple fences (live segments, and
// build-failing errors that name the file and line).
import { describe, expect, it } from 'vitest';
import { highlightJson } from './highlight.js';
import { parseFrontmatter, renderDoc, toPlainMarkdown } from './markdown.js';

const FM = '---\ntitle: T\ndescription: D\norder: 2\n---\n';
const fence = (body: string) => '```ripple\n' + body + '\n```\n';
const html = (doc: ReturnType<typeof renderDoc>) => doc.segments.map((s) => (s.kind === 'html' ? s.html : '')).join('');

describe('frontmatter', () => {
	it('reads title, description and order', () => {
		expect(parseFrontmatter(FM + 'body', 'x.md').meta).toEqual({ title: 'T', description: 'D', order: 2 });
	});
	it('rejects a page without it', () => {
		expect(() => parseFrontmatter('# no', 'x.md')).toThrow('x.md:1: missing frontmatter');
	});
	it('plain markdown leads with the title and description', () => {
		expect(toPlainMarkdown(FM + 'Hello\n', 'x.md')).toBe('# T\n\n> D\n\nHello\n');
	});
});

describe('headings', () => {
	it('gets ids, anchors, dedupes, and builds the h2/h3 outline', () => {
		const doc = renderDoc(FM + '## Set up `Tailwind`\n\n### Dark mode\n\n## Set up Tailwind\n\n#### Deep\n', 'x.md');
		expect(html(doc)).toContain('<h2 id="set-up-tailwind">');
		expect(html(doc)).toContain('<h2 id="set-up-tailwind-2">');
		expect(html(doc)).toContain('href="#dark-mode"');
		expect(doc.headings).toEqual([
			{ id: 'set-up-tailwind', text: 'Set up Tailwind', depth: 2 },
			{ id: 'dark-mode', text: 'Dark mode', depth: 3 },
			{ id: 'set-up-tailwind-2', text: 'Set up Tailwind', depth: 2 }
		]);
	});
});

describe('code blocks', () => {
	it('tokenizes JSON keys, strings, numbers, literals and punctuation', () => {
		const out = highlightJson('{"a": "x<y", "n": -1.5, "ok": true}');
		expect(out).toContain('<span class="tok-key">&quot;a&quot;</span>');
		expect(out).toContain('<span class="tok-str">&quot;x&lt;y&quot;</span>');
		expect(out).toContain('<span class="tok-num">-1.5</span>');
		expect(out).toContain('<span class="tok-lit">true</span>');
		expect(out).toContain('<span class="tok-punct">{</span>');
	});
	it('highlights json fences', () => {
		expect(html(renderDoc(FM + '```json\n{"a": 1}\n```\n', 'x.md'))).toContain('<span class="tok-key">');
	});
	it('escapes other languages as plain text and adds a copy button', () => {
		const out = html(renderDoc(FM + '```svelte\n<Ripple {spec} />\n```\n', 'x.md'));
		expect(out).toContain('<code class="language-svelte">&lt;Ripple {spec} /&gt;</code>');
		expect(out).toContain('data-copy');
		expect(out).not.toContain('tok-');
	});
});

describe('ripple fences', () => {
	const spec = '{ "version": "1.0", "ui": { "type": "text", "props": { "text": "hi" } } }';

	it('splits the page into html, spec, html segments', () => {
		const doc = renderDoc(FM + 'Before\n\n' + fence(spec) + '\nAfter\n', 'x.md');
		expect(doc.segments.map((s) => s.kind)).toEqual(['html', 'spec', 'html']);
		expect(doc.segments[1]).toEqual({ kind: 'spec', spec: JSON.parse(spec) });
		expect(html(doc)).toContain('After');
	});

	it('fails invalid JSON with the file and the line of the error', () => {
		// Frontmatter is lines 1-5, "Intro" line 6, the fence opens on line 8,
		// and the bad line is the block's line 2, so file line 10.
		const src = FM + 'Intro\n\n' + fence('{\n  "version": "1.0",,\n}');
		expect(() => renderDoc(src, 'docs/x.md')).toThrow(/^docs\/x\.md:10: invalid JSON in ripple block/);
	});

	it('fails a widget type the catalog does not know, at the fence line', () => {
		const src = FM + fence('{ "version": "1.0", "ui": { "type": "flex", "children": [{ "type": "nope" }] } }');
		expect(() => renderDoc(src, 'x.md')).toThrow('x.md:6: ripple block uses unknown widget types: nope');
	});

	it('fails a fence that is not an object', () => {
		expect(() => renderDoc(FM + fence('[1]'), 'x.md')).toThrow('x.md:6: ripple block must be a JSON object spec');
	});
});
