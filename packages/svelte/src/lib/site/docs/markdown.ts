// site/docs/markdown.ts — Turns one docs markdown file into what a docs page
// renders: frontmatter, an ordered list of segments (trusted HTML from marked,
// or a live Ripple spec from a ```ripple fence), and the h2/h3 outline for the
// "On this page" rail. Runs on the server at prerender time.
// - Headings get slug ids (deduped with -2, -3) and a trailing # anchor link.
// - ```json blocks are tokenized (highlight.ts); other languages are escaped
//   plain text. Every block gets a Copy button the page wires by delegation.
// - A ```ripple fence must parse as JSON and pass validateCatalog (the
//   svelte-bound one, so the full widget registry counts). Anything else
//   throws `<file>:<line>: ...`, which fails the prerender and so the build.
// The HTML is ours (files in src/docs), so it is not sanitized.

import { Marked, type Token, type Tokens } from 'marked';
import { validateCatalog } from '$lib/widgets/validate-catalog-bound.js';
import { escapeHtml, highlightJson } from './highlight.js';

export interface DocMeta {
	title: string;
	description: string;
	order: number;
}
export interface Heading {
	id: string;
	text: string;
	depth: 2 | 3;
}
export type Segment = { kind: 'html'; html: string } | { kind: 'spec'; spec: Record<string, unknown> };
export interface RenderedDoc {
	meta: DocMeta;
	segments: Segment[];
	headings: Heading[];
}

/** Split `---` frontmatter (flat `key: value` lines) from the body. */
export function parseFrontmatter(raw: string, file: string): { meta: DocMeta; body: string; bodyLine: number } {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
	if (!m) throw new Error(`${file}:1: missing frontmatter (title, description, order)`);
	const fields: Record<string, string> = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = /^(\w+):\s*(.*)$/.exec(line);
		if (kv) fields[kv[1]] = kv[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	if (!fields.title || !fields.description) throw new Error(`${file}:1: frontmatter needs title and description`);
	return {
		meta: { title: fields.title, description: fields.description, order: Number(fields.order ?? 0) },
		body: raw.slice(m[0].length),
		bodyLine: m[0].split('\n').length
	};
}

/** The markdown body without frontmatter, headed by `# Title` and the description. Used for raw .md and llms files. */
export function toPlainMarkdown(raw: string, file: string): string {
	const { meta, body } = parseFrontmatter(raw, file);
	return `# ${meta.title}\n\n> ${meta.description}\n\n${body.trim()}\n`;
}

export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/<[^>]+>/g, '')
			.replace(/&[a-z#0-9]+;/g, '')
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-') || 'section'
	);
}

/** Parse a ```ripple fence. `line` is the line of its opening ``` in the file, for errors. */
export function parseRippleFence(src: string, file: string, line: number): Record<string, unknown> {
	let spec: unknown;
	try {
		spec = JSON.parse(src);
	} catch (e) {
		// V8 reports "(line N column M)" inside the block; point at that file line.
		const at = /\(line (\d+) column/.exec((e as Error).message);
		const where = at ? line + Number(at[1]) : line;
		throw new Error(`${file}:${where}: invalid JSON in ripple block: ${(e as Error).message}`, {
			cause: e
		});
	}
	if (!spec || typeof spec !== 'object' || Array.isArray(spec))
		throw new Error(`${file}:${line}: ripple block must be a JSON object spec`);
	const unknown = validateCatalog(spec as Parameters<typeof validateCatalog>[0]);
	if (unknown.length)
		throw new Error(
			`${file}:${line}: ripple block uses unknown widget types: ${unknown.map((u) => `${u.type} at ${u.path}`).join(', ')}`
		);
	return spec as Record<string, unknown>;
}

const COPY = '<button type="button" class="copy" data-copy data-pagefind-ignore>Copy</button>';

export function renderDoc(raw: string, file: string): RenderedDoc {
	const { meta, body, bodyLine } = parseFrontmatter(raw, file);
	const headings: Heading[] = [];
	const used = new Map<string, number>();

	const md = new Marked({ gfm: true });
	md.use({
		renderer: {
			heading({ tokens, depth }: Tokens.Heading) {
				const inner = this.parser.parseInline(tokens);
				const base = slugify(inner);
				const n = (used.get(base) ?? 0) + 1;
				used.set(base, n);
				const id = n === 1 ? base : `${base}-${n}`;
				const text = inner.replace(/<[^>]+>/g, '');
				if (depth === 2 || depth === 3) headings.push({ id, text, depth });
				return `<h${depth} id="${id}">${inner}<a class="anchor" href="#${id}" aria-label="Link to this section" data-pagefind-ignore>#</a></h${depth}>\n`;
			},
			code({ text, lang }: Tokens.Code) {
				const language = (lang ?? '').split(/\s/)[0];
				const html = language === 'json' ? highlightJson(text) : escapeHtml(text);
				const cls = language ? ` class="language-${escapeHtml(language)}"` : '';
				return `<div class="code-block"><pre><code${cls}>${html}</code></pre>${COPY}</div>\n`;
			}
		}
	});

	const segments: Segment[] = [];
	let pending: Token[] = [];
	let line = bodyLine;
	const flush = () => {
		if (!pending.length) return;
		// parser() reads `links` off the token list for reference-style links.
		const list = Object.assign(pending, { links: tokens.links });
		segments.push({ kind: 'html', html: md.parser(list) });
		pending = [];
	};

	const tokens = md.lexer(body);
	for (const token of tokens) {
		if (token.type === 'code' && (token as Tokens.Code).lang?.trim() === 'ripple') {
			flush();
			segments.push({ kind: 'spec', spec: parseRippleFence((token as Tokens.Code).text, file, line) });
		} else pending.push(token);
		line += token.raw.split('\n').length - 1;
	}
	flush();
	return { meta, segments, headings };
}
