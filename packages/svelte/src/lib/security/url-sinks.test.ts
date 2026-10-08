// url-sinks.test.ts — every spec-controlled URL sink in the renderer goes
// through `safeUrl` from @ripple-ui/core. Two halves: jsdom renders of the
// widgets the exploit used (expressions that BUILD `javascript:` at render
// time), and a static audit that fails on any new href/src/action/poster
// attribute or window.open in a .svelte file that skips the guard.
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
		expect(a!.getAttribute('href')).toBe('#');
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
});

// ---- static audit -------------------------------------------------------
// Vite's raw glob, not node:fs: the tsconfig carries no node types.
const SOURCES = import.meta.glob('../**/*.svelte', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const GUARDED = /^(safeUrl|safeHref|safeKbUrl)\(/;
// Sinks guarded by a stricter local check.
const EXEMPT: Record<string, string[]> = {
	'widgets/media/Embed.svelte': ['safeUrl'] // https-only isSafeEmbedUrl
};

function braced(src: string, open: number): string {
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === '{') depth++;
		else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i).trim();
	}
	return '';
}

describe('static URL-sink audit', () => {
	it('every href/src/srcset/action/formaction/poster attribute and window.open goes through safeUrl', () => {
		expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
		const misses: string[] = [];
		for (const [path, raw] of Object.entries(SOURCES)) {
			const rel = path.replace(/^\.\.\//, '');
			// drop <style> blocks and comments; they carry no runtime attributes
			const src = raw
				.replace(/<style[\s\S]*?<\/style>/g, '')
				.replace(/<!--[\s\S]*?-->/g, '');
			const attr = /[\s{](href|src|srcset|action|formaction|poster|xlink:href|environment-image)=\{/g;
			for (let m; (m = attr.exec(src)); ) {
				const expr = braced(src, m.index + m[0].length - 1);
				if (!GUARDED.test(expr) && !(EXEMPT[rel] ?? []).includes(expr)) misses.push(`${rel}: ${m[1]}={${expr}}`);
			}
			for (const m of src.matchAll(/\s\{(href|src|srcset|action|formaction|poster)\}/g)) misses.push(`${rel}: {${m[1]}} shorthand`);
			for (const m of src.matchAll(/window\.open\(\s*([^,)]*)/g))
				if (!/^(safeUrl\(|safeLink\b)/.test(m[1])) misses.push(`${rel}: window.open(${m[1]})`);
		}
		expect(misses).toEqual([]);
	});
});
