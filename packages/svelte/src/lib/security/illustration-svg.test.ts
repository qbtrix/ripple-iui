// security/illustration-svg.test.ts — the illustration SVG contract: every
// hostile probe is refused by checkIllustrationSvg AND neutralised by
// sanitizeIllustrationSvg; a good animated SVG passes and rebuilds with
// prefixed ids whose url(#..), href and begin refs still point at them.
import { describe, expect, it } from 'vitest';
import { ILLUSTRATION_CAPS } from '@ripple-ui/core/manifest';
import { checkIllustrationSvg, sanitizeIllustrationSvg, hasAnimation } from './illustration-svg.js';

const wrap = (inner: string, attrs = '') => `<svg viewBox='0 0 100 100'${attrs}>${inner}</svg>`;
const nest = (n: number) => '<g>'.repeat(n) + '</g>'.repeat(n);

const PROBES: Array<[string, string]> = [
	['set href on use', wrap(`<use href='#a'><set attributeName='href' to='javascript:alert(1)'/></use><rect id='a'/>`)],
	['animate xlink:href', wrap(`<rect><animate attributeName='xlink:href' values='javascript:alert(1)' dur='1s'/></rect>`)],
	['set onload', wrap(`<rect><set attributeName='onload' to='alert(1)'/></rect>`)],
	['a javascript href', wrap(`<a href='javascript:alert(1)'><rect/></a>`)],
	['image', wrap(`<image href='http://x/y.png'/>`)],
	['remote url() fill', wrap(`<rect fill='url(http://x/#a)'/>`)],
	['style element @import', wrap(`<style>@import url(http://x)</style>`)],
	['style attribute', wrap(`<rect style='fill:url(http://x)'/>`)],
	['DOCTYPE + ENTITY', `<!DOCTYPE svg [<!ENTITY a 'x'>]>` + wrap(`<text>&a;</text>`)],
	['foreignObject iframe', wrap(`<foreignObject><iframe xmlns='http://www.w3.org/1999/xhtml' src='http://x'/></foreignObject>`)],
	['svg onload', `<svg viewBox='0 0 1 1' onload='alert(1)'><rect/></svg>`],
	['1000-deep nesting', wrap(nest(1000))],
	['over 24,000 chars', wrap(`<desc>${'x'.repeat(ILLUSTRATION_CAPS.maxChars)}</desc>`)],
	['dur 0.01s', wrap(`<rect><animate attributeName='x' from='0' to='9' dur='0.01s'/></rect>`)],
	['41 animation elements', wrap(`<rect>${"<animate attributeName='x' from='0' to='1' dur='1s'/>".repeat(41)}</rect>`)],
	['use remote href', wrap(`<use href='http://x#a'/>`)],
	['JaVaScRiPt with tab and newline', wrap(`<use href='#a'/><rect id='a'><set attributeName='fill' to='JaVa&#9;Scr\nIpT:alert(1)'/></rect>`)]
];

/** Anything in the rebuilt tree a hostile probe could have used. */
function residue(svg: Element): string[] {
	const out: string[] = [];
	for (const el of [svg, ...svg.querySelectorAll('*')]) {
		const tag = el.localName;
		if (/^(script|style|foreignObject|iframe|object|embed|a|image|feImage|audio|video|canvas)$/i.test(tag)) out.push(`<${tag}>`);
		if (el.namespaceURI !== 'http://www.w3.org/2000/svg') out.push(`<${tag}> ns ${el.namespaceURI}`);
		for (const a of el.attributes) {
			// oxlint-disable-next-line no-control-regex -- matching control characters is the point
			const v = a.value.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
			if (/^on/i.test(a.localName) || a.localName === 'style') out.push(`${tag}@${a.name}`);
			if (/javascript:|data:|vbscript:|url\((?!#)/.test(v)) out.push(`${tag}@${a.name}=${a.value}`);
			if (a.localName === 'href' && !a.value.startsWith('#')) out.push(`${tag}@href=${a.value}`);
			if (a.localName === 'attributeName' && /href|^on|style/i.test(a.value)) out.push(`${tag}@attributeName=${a.value}`);
		}
	}
	return out;
}

describe('hostile probes', () => {
	it.each(PROBES)('%s is refused by the policy check', (_n, markup) => {
		const r = checkIllustrationSvg(markup);
		expect(r.ok).toBe(false);
	});

	it.each(PROBES)('%s is neutralised by the rebuild', (_n, markup) => {
		const out = sanitizeIllustrationSvg(markup, document, 'p-');
		if (out) expect(residue(out)).toEqual([]);
	});

	it('returns null (renders nothing) past every cap', () => {
		for (const name of ['1000-deep nesting', 'over 24,000 chars', 'dur 0.01s', '41 animation elements', 'DOCTYPE + ENTITY']) {
			const markup = PROBES.find(([n]) => n === name)![1];
			expect(sanitizeIllustrationSvg(markup, document, 'p-'), name).toBeNull();
		}
	});

	it('refuses an XHTML-namespaced element and a CSS-escaped url() never survives the rebuild', () => {
		expect(checkIllustrationSvg(wrap(`<div xmlns='http://www.w3.org/1999/xhtml'/>`)).ok).toBe(false);
		const out = sanitizeIllustrationSvg(wrap(`<rect fill='\\75 rl(http://x)'/>`), document, 'p-')!;
		expect(out.querySelector('rect')!.hasAttribute('fill')).toBe(false);
	});

	it('refuses non-standard entities and markup inside CDATA, keeps the five and numeric refs', () => {
		expect(checkIllustrationSvg(wrap(`<text>&nbsp;</text>`)).ok).toBe(false);
		expect(checkIllustrationSvg(wrap(`<text><![CDATA[<script>x</script>]]></text>`)).ok).toBe(false);
		expect(checkIllustrationSvg(wrap(`<text>&lt;3 &amp; &#169; &#x2014;</text>`))).toEqual({ ok: true });
	});

	it('never throws on junk', () => {
		for (const junk of ['', 'not svg', '<svg', '<html><body/></html>', '<svg viewBox="0 0 1 1"><rect', null, 42] as unknown as string[]) {
			expect(() => sanitizeIllustrationSvg(junk, document, 'p-')).not.toThrow();
			expect(sanitizeIllustrationSvg(junk, document, 'p-')).toBeNull();
			expect(checkIllustrationSvg(junk).ok).toBe(false);
		}
	});
});

const GOOD = `<svg viewBox='0 0 200 120'>
<defs>
	<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#bfe3ff'/><stop offset='1' stop-color='#fff'/></linearGradient>
	<clipPath id='frame'><rect width='200' height='120' rx='8'/></clipPath>
	<path id='route' d='M10 100 C60 20 140 20 190 60'/>
</defs>
<g clip-path='url(#frame)'>
	<rect width='200' height='120' fill='url(#sky)'/>
	<circle id='sun' cx='100' cy='110' r='18' fill='#ffb703'>
		<animate id='rise' attributeName='cy' from='110' to='48' dur='3s' fill='freeze'/>
		<animate attributeName='r' values='18;20;18' dur='2s' begin='rise.end' repeatCount='indefinite'/>
	</circle>
	<g><polygon points='0,0 10,4 0,8' fill='#335'><animateMotion dur='4s' repeatCount='3' rotate='auto'><mpath href='#route'/></animateMotion></polygon></g>
	<use href='#sun' x='5' opacity='0.2'/>
	<text x='10' y='20' font-family='Inter, sans-serif' font-size='10'>Good <tspan fill='#c00'>morning</tspan></text>
	<rect class='extra' filter='url(#blur)' width='1' height='1'/>
</g>
</svg>`;

describe('a good animated SVG', () => {
	it('passes the policy check (harmless unknowns like class and filter pass)', () => {
		expect(checkIllustrationSvg(GOOD)).toEqual({ ok: true });
	});

	it('rebuilds with prefixed ids and refs that still resolve', () => {
		const svg = sanitizeIllustrationSvg(GOOD, document, 'ill-x-')!;
		expect(svg).not.toBeNull();
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.getAttribute('viewBox')).toBe('0 0 200 120');
		const ids = [...svg.querySelectorAll('[id]')].map((e) => e.id);
		expect(ids.toSorted()).toEqual(['ill-x-frame', 'ill-x-rise', 'ill-x-route', 'ill-x-sky', 'ill-x-sun']);
		expect(svg.querySelector('g')!.getAttribute('clip-path')).toBe('url(#ill-x-frame)');
		expect(svg.querySelector('rect[fill]')!.getAttribute('fill')).toBe('url(#ill-x-sky)');
		expect(svg.querySelector('use')!.getAttribute('href')).toBe('#ill-x-sun');
		expect(svg.querySelector('mpath')!.getAttribute('href')).toBe('#ill-x-route');
		expect(svg.querySelector('[begin]')!.getAttribute('begin')).toBe('ill-x-rise.end');
		// every reference lands on an id that exists in this tree
		const refs = [...svg.querySelectorAll('*')].flatMap((el) =>
			[...el.attributes].flatMap((a) =>
				a.localName === 'href' ? [a.value.slice(1)] : [...a.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1])
			)
		);
		expect(refs.filter((r) => !ids.includes(r))).toEqual([]);
		// unknown attributes are dropped silently; text survives
		expect(svg.querySelector('.extra')).toBeNull();
		expect(svg.querySelector('[filter]')).toBeNull();
		expect(svg.querySelector('text')!.textContent).toBe('Good morning');
		expect(svg.querySelector('text')!.getAttribute('font-family')).toBe('Inter, sans-serif');
		expect(hasAnimation(svg)).toBe(true);
		expect(residue(svg)).toEqual([]);
	});

	it('treats a missing xmlns as SVG, as the model guidance writes it', () => {
		expect(GOOD.includes('xmlns')).toBe(false);
		const withNs = GOOD.replace("<svg viewBox='0 0 200 120'>", "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'>");
		expect(checkIllustrationSvg(withNs)).toEqual({ ok: true });
		expect(sanitizeIllustrationSvg(withNs, document, 'p-')).not.toBeNull();
	});

	it('drops a bad attributeName animation but keeps the rest', () => {
		const svg = sanitizeIllustrationSvg(wrap(`<rect width='5'><set attributeName='href' to='#x'/><animate attributeName='x' from='0' to='5' dur='1s'/></rect>`), document, 'p-')!;
		expect(svg.querySelectorAll('set')).toHaveLength(0);
		expect(svg.querySelectorAll('animate')).toHaveLength(1);
		expect(svg.querySelector('rect')!.getAttribute('width')).toBe('5');
	});

	it('accepts the caps at their limits', () => {
		expect(checkIllustrationSvg(wrap(nest(23))).ok).toBe(true);
		expect(checkIllustrationSvg(wrap(nest(24))).ok).toBe(false);
		const forty = wrap(`<rect>${"<animate attributeName='x' from='0' to='1' dur='0.5s'/>".repeat(40)}</rect>`);
		expect(checkIllustrationSvg(forty).ok).toBe(true);
		expect(checkIllustrationSvg(wrap(`<rect><animate attributeName='x' dur='500ms' repeatCount='1000'/></rect>`)).ok).toBe(true);
		expect(checkIllustrationSvg(wrap(`<rect><animate attributeName='x' dur='1s' repeatCount='1001'/></rect>`)).ok).toBe(false);
		expect(checkIllustrationSvg(wrap('<rect/>'.repeat(399))).ok).toBe(true);
		expect(checkIllustrationSvg(wrap('<rect/>'.repeat(400))).ok).toBe(false);
	});
});
