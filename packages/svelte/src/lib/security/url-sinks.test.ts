// url-sinks.test.ts — every spec-controlled URL and style sink in the renderer
// goes through `safeUrl` / `safeStyle` from @ripple-ui/core. Two halves: jsdom
// renders of the widgets the exploit used (expressions that BUILD
// `javascript:` at render time), and a static audit (`auditSvelte`,
// `auditTs`) that fails on any sink that skips the guard. The audit's rules
// are themselves tested against in-file fixture snippets, so a regex that
// stops matching fails here instead of passing silently.
import { fireEvent, render } from '@testing-library/svelte';
import { tick, type Component } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import Cta from '$lib/widgets/marketing/Cta.svelte';
import Hero from '$lib/widgets/marketing/Hero.svelte';
import Navbar from '$lib/widgets/marketing/Navbar.svelte';
import Footer from '$lib/widgets/marketing/Footer.svelte';
import LogoCloud from '$lib/widgets/marketing/LogoCloud.svelte';
import LinkPreview from '$lib/widgets/display/LinkPreview.svelte';
import Breadcrumb from '$lib/widgets/layout/Breadcrumb.svelte';
import SourceChip from '$lib/widgets/ai/SourceChip.svelte';
import Mention from '$lib/widgets/display/Mention.svelte';
import Image from '$lib/widgets/display/Image.svelte';
import VideoPlayer from '$lib/widgets/media/VideoPlayer.svelte';
import AudioPlayer from '$lib/widgets/media/AudioPlayer.svelte';
import Form from '$lib/widgets/input/Form.svelte';
import UiButton from '$lib/components/ui/button/button.svelte';
import Citation from '$lib/widgets/research/Citation.svelte';
import NewsCard from '$lib/widgets/research/NewsCard.svelte';
import SourceCard from '$lib/widgets/research/SourceCard.svelte';
import DiscoverCard from '$lib/widgets/research/DiscoverCard.svelte';

const P = 'javascript:alert(1)';
const URL_ATTRS = ['href', 'src', 'srcset', 'action', 'formaction', 'poster', 'data', 'xlink:href', 'environment-image'];
const DANGER = /^\s*(javascript|vbscript|file|blob):|^\s*data:(?!image\/(png|gif|jpeg|webp)[;,])/i;

function dangerous(root: Element): string[] {
	const out: string[] = [];
	for (const el of root.querySelectorAll('*')) {
		for (const a of URL_ATTRS) {
			const v = el.getAttribute(a);
			if (v != null && DANGER.test(v)) out.push(`<${el.tagName.toLowerCase()} ${a}="${v}">`);
		}
		const st = el.getAttribute('style') ?? '';
		if (/url\(\s*['"]?\s*(javascript|vbscript)/i.test(st)) out.push(`<${el.tagName.toLowerCase()} style="${st}">`);
	}
	return out;
}

afterEach(() => vi.restoreAllMocks());

describe('cta href built by an expression (the reported exploit)', () => {
	it.each([
		["{'java'+'script:alert(1)'}", {}],
		['{state.a}:alert(1)', { a: 'javascript' }],
		['javascript{state.c}', { c: ':alert(1)' }]
	])('%s never reaches href as javascript:', async (href, state) => {
		const { container } = render(Ripple, {
			props: { spec: { state, ui: { type: 'cta', props: { headline: 'H', button: 'Go', label: 'Go', href } } } }
		});
		await tick();
		const a = container.querySelector('a');
		expect(a).not.toBeNull();
		// blocked links render no href at all: an inert <a>, not a copy of the page
		expect(a!.hasAttribute('href')).toBe(false);
		expect(dangerous(container)).toEqual([]);
	});

	it('keeps a safe resolved href', async () => {
		const { container } = render(Ripple, {
			props: { spec: { state: { p: 'pricing' }, ui: { type: 'cta', props: { headline: 'H', button: 'Go', href: '/{state.p}' } } } }
		});
		await tick();
		expect(container.querySelector('a')!.getAttribute('href')).toBe('/pricing');
	});

	it('strips an unsafe url() from the node style', async () => {
		const { container } = render(Ripple, {
			props: {
				spec: {
					ui: { type: 'cta', style: { color: 'red', 'background-image': 'url(javascript:alert(1))' }, props: { headline: 'H' } }
				}
			}
		});
		await tick();
		const st = container.querySelector('section')!.getAttribute('style') ?? '';
		expect(st).toContain('color');
		expect(st).not.toContain('url(');
	});
});

// Props are post-resolution values, so a raw payload stands in for any expression.
const CASES: Array<[string, Component<any>, Record<string, unknown>, string?]> = [
	['cta', Cta, { headline: 'H', button: 'Go', href: P }, 'a'],
	['hero', Hero, { title: 'T', cta: 'Go', ctaHref: P, secondaryCta: 'More', secondaryCtaHref: P }, 'a'],
	['navbar', Navbar, { brand: 'B', links: [{ label: 'L', href: P }], cta: 'Go', ctaHref: P }, 'a'],
	['footer', Footer, { columns: [{ title: 'C', links: [{ label: 'L', href: P }] }] }, 'a'],
	['logo-cloud', LogoCloud, { logos: [{ src: P, alt: 'x', href: P }, { src: 'data:text/html,x', alt: 'y' }] }, 'a'],
	['link-preview', LinkPreview, { url: P, title: 'T', image: P, favicon: P }, 'a'],
	['breadcrumb', Breadcrumb, { items: [{ label: 'A', href: P }, { label: 'B', href: P }, { label: 'C' }] }, 'a'],
	['source-chip', SourceChip, { label: 'S', href: P, image: P }, 'a'],
	['mention', Mention, { name: 'n', href: P, avatar: P }],
	['image', Image, { src: P, alt: 'x' }, 'img'],
	['video-player', VideoPlayer, { src: P, poster: 'data:text/html,<script>alert(1)</script>' }, 'video'],
	['audio-player', AudioPlayer, { src: P, cover: P }, 'audio'],
	['form', Form, { action: P }, 'form'],
	['ui button', UiButton, { href: P }, 'a']
];

describe('widget URL sinks', () => {
	it.each(CASES)('%s renders no dangerous URL', async (_name, C, props, tag) => {
		const { container } = render(C, { props });
		await tick();
		if (tag) expect(container.querySelector(tag)).not.toBeNull();
		expect(dangerous(container)).toEqual([]);
	});
});

describe('window.open sinks', () => {
	it.each([
		['citation', Citation, { index: 1, title: 'T', url: P }],
		['news-card', NewsCard, { headline: 'H', source: 'S', url: P }],
		['source-card', SourceCard, { title: 'T', url: P }],
		['discover-card', DiscoverCard, { title: 'T', url: P }]
	] as Array<[string, Component<any>, Record<string, unknown>]>)('%s never opens a javascript: url', async (_n, C, props) => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		const { container } = render(C, { props });
		await tick();
		for (const el of container.querySelectorAll('*')) await fireEvent.click(el);
		for (const call of open.mock.calls) expect(String(call[0])).not.toMatch(DANGER);
		expect(dangerous(container)).toEqual([]);
	});

	it.each([
		['citation', Citation, { index: 1, title: 'T', url: 'https://ok.example/a' }],
		['news-card', NewsCard, { headline: 'H', source: 'S', url: 'https://ok.example/a' }],
		['source-card', SourceCard, { title: 'T', url: 'https://ok.example/a' }],
		['discover-card', DiscoverCard, { title: 'T', url: 'https://ok.example/a' }]
	] as Array<[string, Component<any>, Record<string, unknown>]>)('%s opens with noopener,noreferrer', async (_n, C, props) => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		const { container } = render(C, { props });
		await tick();
		for (const el of container.querySelectorAll('*')) await fireEvent.click(el);
		expect(open).toHaveBeenCalled();
		for (const call of open.mock.calls) {
			expect(call[1]).toBe('_blank');
			expect(String(call[2])).toMatch(/noopener/);
			expect(String(call[2])).toMatch(/noreferrer/);
		}
	});
});

describe('target=_blank links carry rel=noopener noreferrer', () => {
	it.each([
		['source-chip', SourceChip, { label: 'S', href: 'https://ok.example' }],
		['link-preview', LinkPreview, { url: 'https://ok.example', title: 'T', newTab: true }]
	] as Array<[string, Component<any>, Record<string, unknown>]>)('%s', async (_n, C, props) => {
		const { container } = render(C, { props });
		await tick();
		const links = container.querySelectorAll('a[target="_blank"]');
		expect(links.length).toBeGreaterThan(0);
		for (const a of links) expect(a.getAttribute('rel') ?? '').toMatch(/(?=.*noopener)(?=.*noreferrer)/);
	});
});

// ---- static audit -------------------------------------------------------
// Vite's raw glob, not node:fs: the tsconfig carries no node types.
const SOURCES = import.meta.glob('../**/*.svelte', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const TS_SOURCES = import.meta.glob(['../widgets/**/*.ts', '!../widgets/**/*.test.ts'], {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;
const URL_GUARDS = ['safeUrl', 'safeHref', 'safeKbUrl'];
// Sinks guarded by a stricter local check.
const EXEMPT: Record<string, string[]> = {
	'widgets/media/Embed.svelte': ['safeUrl'] // https-only isSafeEmbedUrl
};
const EXEMPT_MISSES = new Set([
	// srcdoc is the documented escape hatch: renderer-fixed sandbox, no allow-same-origin
	'widgets/media/Embed.svelte: srcdoc={…}',
	// bits-ui trigger props (renderer-owned); href={safeUrl(href)} comes after and wins
	'widgets/display/Mention.svelte: {...spread} on native <a>',
	// TipTap parses into an inert DOMParser document and keeps only schema nodes
	'widgets/input/RichText.svelte: .setContent() takes unescaped HTML'
]);
const SINK_ATTRS = "href|src|srcset|action|formaction|poster|ping|xlink:href|environment-image";
const NATIVE = new Set(['a', 'img', 'iframe', 'form', 'object', 'embed', 'video', 'audio', 'source']);

/** Index just past the `}` closing the `{` at `open`, skipping quoted text. */
function closeAt(src: string, open: number, o = '{', c = '}'): number {
	let depth = 0;
	let q = '';
	for (let i = open; i < src.length; i++) {
		const ch = src[i];
		if (q) {
			if (ch === '\\') i++;
			else if (ch === q) q = '';
		} else if (ch === '"' || ch === "'" || ch === '`') q = ch;
		else if (ch === o) depth++;
		else if (ch === c && --depth === 0) return i + 1;
	}
	return src.length;
}
const braced = (src: string, open: number) => src.slice(open + 1, closeAt(src, open) - 1).trim();

/** `expr` is exactly one call to a guard: `safeUrl(x)`, not `safeUrl(a) || b`. */
function singleCall(expr: string, names: string[]): boolean {
	const m = /^([\w$]+)\(/.exec(expr);
	return !!m && names.includes(m[1]) && closeAt(expr, m[0].length - 1, '(', ')') === expr.length;
}

/** Each `<tag …>` in markup, with its attribute text (brace- and quote-aware). */
function tags(markup: string): Array<{ name: string; text: string }> {
	const out: Array<{ name: string; text: string }> = [];
	for (const m of markup.matchAll(/<([A-Za-z][\w.:-]*)/g)) {
		let i = m.index! + m[0].length;
		let q = '';
		for (; i < markup.length; i++) {
			const ch = markup[i];
			if (q) {
				if (ch === q) q = '';
			} else if (ch === '"' || ch === "'") q = ch;
			else if (ch === '{') i = closeAt(markup, i) - 1;
			else if (ch === '>') break;
		}
		out.push({ name: m[1], text: markup.slice(m.index!, i + 1) });
	}
	return out;
}

function auditSvelte(rel: string, raw: string): string[] {
	const misses: string[] = [];
	const noComments = raw.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
	const script = (noComments.match(/<script[\s\S]*?<\/script>/g) ?? []).join('\n');
	const markup = noComments.replace(/<script[\s\S]*?<\/script>/g, '');
	const widget = rel.startsWith('widgets/');

	for (const m of markup.matchAll(new RegExp(`[\\s{](${SINK_ATTRS})=\\{`, 'g'))) {
		const expr = braced(markup, m.index! + m[0].length - 1);
		if (!singleCall(expr, URL_GUARDS) && !(EXEMPT[rel] ?? []).includes(expr)) misses.push(`${rel}: ${m[1]}={${expr}}`);
	}
	for (const m of markup.matchAll(new RegExp(`\\s(${SINK_ATTRS}|srcdoc|style)="([^"]*\\{[^"]*)"`, 'g')))
		if (m[1] !== 'style' || widget) misses.push(`${rel}: ${m[1]}="${m[2]}" quoted interpolation`);
	for (const m of markup.matchAll(/\ssrcdoc=\{/g)) misses.push(`${rel}: srcdoc={…}`);
	for (const m of markup.matchAll(/\s\{(href|src|srcset|action|formaction|poster|ping|srcdoc)\}/g))
		misses.push(`${rel}: {${m[1]}} shorthand`);
	if (widget)
		for (const m of markup.matchAll(/\sstyle=\{/g)) {
			const expr = braced(markup, m.index! + m[0].length - 1);
			if (!singleCall(expr, ['safeStyle']) && !/^[\w$.?]+$/.test(expr)) misses.push(`${rel}: style={${expr}}`);
		}
	for (const t of tags(markup)) {
		if (/_blank/.test(t.text) && !(/noopener/.test(t.text) && /noreferrer/.test(t.text)))
			misses.push(`${rel}: <${t.name}> target=_blank without rel="noopener noreferrer"`);
		if (!NATIVE.has(t.name)) continue;
		if (widget && /\{\s*\.\.\./.test(t.text)) misses.push(`${rel}: {...spread} on native <${t.name}>`);
		if (t.name === 'object' && /\s\{data\}/.test(t.text)) misses.push(`${rel}: <object {data}>`);
		if (t.name === 'object')
			for (const d of t.text.matchAll(/\sdata=\{/g)) {
				const expr = braced(t.text, d.index! + d[0].length - 1);
				if (!singleCall(expr, URL_GUARDS)) misses.push(`${rel}: <object data={${expr}}>`);
			}
	}
	for (const m of noComments.matchAll(/window\.open\(/g)) {
		const args = noComments.slice(m.index! + m[0].length, closeAt(noComments, m.index! + m[0].length - 1, '(', ')') - 1);
		if (!/^\s*(safeUrl\(|safeLink\b)/.test(args) || !/noopener/.test(args)) misses.push(`${rel}: window.open(${args})`);
	}
	// HTML built as a string (Leaflet divIcon etc.) is innerHTML: every
	// interpolated attribute must be escaped, and a style one also safeStyle'd.
	for (const m of script.matchAll(/([\w-]+)="([^"]*\$\{[^"]*)"/g)) {
		const guard = m[1] === 'style' ? /^\$\{escapeHtml\(safeStyle\(/ : /^\$\{escapeHtml\(/;
		if (!guard.test(m[2])) misses.push(`${rel}: ${m[1]}="\${${m[2]}}" in an HTML string`);
	}
	// Leaflet (and similar) APIs that take an HTML string render it as innerHTML.
	for (const m of script.matchAll(/\.(bindPopup|bindTooltip|setContent|setPopupContent|setTooltipContent)\(\s*/g))
		if (!/^(escapeHtml\(|sanitizeHtml\(|['"`])/.test(script.slice(m.index! + m[0].length)))
			misses.push(`${rel}: .${m[1]}() takes unescaped HTML`);
	for (const m of script.matchAll(/\battribution:\s*([^,}\n]+)/g))
		if (!/^(sanitizeHtml\(|['"`]|string\b|[\w$.]+\.attribution\s*$)/.test(m[1].trim()))
			misses.push(`${rel}: attribution: ${m[1].trim()} takes unsanitized HTML`);
	return misses.filter((m) => !EXEMPT_MISSES.has(m));
}

function auditTs(rel: string, src: string): string[] {
	const misses: string[] = [];
	for (const m of src.matchAll(/(?<![\w.])location\.|\bwindow\.location\b|\bsetAttribute\(|\bwindow\.open\(/g))
		misses.push(`${rel}: ${m[0]}`);
	return misses;
}

describe('static audit rules catch bad fixtures', () => {
	const BAD_SVELTE: Array<[string, string]> = [
		['unguarded href', '<a href={url}>x</a>'],
		['quoted href interpolation', '<a href="{url}">x</a>'],
		['quoted href partial', '<a href="/x/{id}">x</a>'],
		['guard || fallback', '<a href={safeUrl(a) || b}>x</a>'],
		['guard ?? fallback', '<img src={safeUrl(a, { kind: "resource" }) ?? b} alt="" />'],
		['ternary around guard', '<a href={ok ? safeUrl(a) : b}>x</a>'],
		['spread onto <a>', '<a {...rest} href={safeUrl(u)}>x</a>'],
		['spread onto <iframe>', '<iframe {...props} title="t"></iframe>'],
		['object data', '<object data={u} title="t"></object>'],
		['object data shorthand', '<object {data} title="t"></object>'],
		['ping', '<a href={safeUrl(u)} ping={p}>x</a>'],
		['srcdoc', '<iframe srcdoc={html} title="t"></iframe>'],
		['formaction', '<button formaction={u}>x</button>'],
		['quoted style interpolation', '<div style="background:{color}"></div>'],
		['template style', '<div style={`color:${c}`}></div>'],
		['ternary style', '<div style={c ? `color:${c}` : undefined}></div>'],
		['safeStyle + concat', '<div style={safeStyle(a) + b}></div>'],
		['_blank without rel', '<a href={safeUrl(u)} target="_blank">x</a>'],
		['_blank with noreferrer only', '<a href={safeUrl(u)} target="_blank" rel="noreferrer">x</a>'],
		['window.open raw', '<script>window.open(url, "_blank", "noopener")</script>'],
		['window.open no noopener', '<script>window.open(safeLink, "_blank")</script>'],
		['HTML string style', '<script>const h = `<span style="background:${color};"></span>`;</script>'],
		['HTML string attr', '<script>const h = `<span data-icon="${icon}"></span>`;</script>'],
		['leaflet popup', '<script>lm.bindPopup(m.popup);</script>'],
		['leaflet popup template', '<script>lm.bindPopup(`<b>${x}</b>`);</script>'],
		['leaflet tooltip', '<script>line.bindTooltip(p.label, { sticky: true });</script>'],
		['leaflet setContent', '<script>popup.setContent(html);</script>'],
		['leaflet attribution', '<script>L.tileLayer(u, { attribution: tileAttribution ?? preset.attribution });</script>']
	];
	it.each(BAD_SVELTE)('flags %s', (_n, src) => expect(auditSvelte('widgets/x/Fixture.svelte', src)).not.toEqual([]));

	const GOOD_SVELTE: Array<[string, string]> = [
		['guarded href', '<a href={safeUrl(u)}>x</a>'],
		['guarded resource', '<img src={safeUrl(u, { kind: "resource" })} alt="" />'],
		['static style', '<div style="color:red"></div>'],
		['safeStyle', '<div style={safeStyle(`color:${c}`)}></div>'],
		['bare style identifier', '<div style={styleString}></div>'],
		['_blank with rel', '<a href={safeUrl(u)} target="_blank" rel="noopener noreferrer">x</a>'],
		['window.open guarded', '<script>window.open(safeLink, "_blank", "noopener,noreferrer")</script>'],
		['HTML string escaped', '<script>const h = `<span style="${escapeHtml(safeStyle(`background:${c}`))}"></span>`;</script>'],
		['spread on a component', '<Button {...rest}>x</Button>'],
		['leaflet popup escaped', '<script>lm.bindPopup(escapeHtml(String(m.popup)));</script>'],
		['leaflet popup static', "<script>lm.bindPopup('<b>Depot</b>'); t.bindTooltip(`Static`);</script>"],
		['leaflet attribution sanitized', '<script>L.tileLayer(u, { attribution: sanitizeHtml(a) });</script>'],
		['leaflet attribution preset', "<script>const P = { a: { attribution: '&copy; OSM' } }; L.tileLayer(u, { attribution: src.attribution });</script>"],
		['data shorthand on a component', '<Chart {data} />']
	];
	it.each(GOOD_SVELTE)('passes %s', (_n, src) => expect(auditSvelte('widgets/x/Fixture.svelte', src)).toEqual([]));

	it.each([
		['location.href =', 'location.href = url;'],
		['window.location', 'window.location.assign(url);'],
		['setAttribute', "el.setAttribute('href', url);"],
		['window.open', "window.open(url, '_blank');"]
	])('flags %s in a widget .ts file', (_n, src) => expect(auditTs('widgets/x/fixture.ts', src)).not.toEqual([]));
	it('does not flag geolocation or a data field named location', () =>
		expect(auditTs('widgets/x/fixture.ts', 'navigator.geolocation.getCurrentPosition(f); p.location.lat')).toEqual([]));
});

describe('static URL/style-sink audit', () => {
	it('every .svelte sink goes through its guard', () => {
		expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
		const misses = Object.entries(SOURCES).flatMap(([path, raw]) => auditSvelte(path.replace(/^\.\.\//, ''), raw));
		expect(misses).toEqual([]);
	});
	it('no widget .ts file touches location, setAttribute or window.open', () => {
		expect(Object.keys(TS_SOURCES).length).toBeGreaterThan(10);
		const misses = Object.entries(TS_SOURCES).flatMap(([path, raw]) => auditTs(path.replace(/^\.\.\//, ''), raw));
		expect(misses).toEqual([]);
	});
});
