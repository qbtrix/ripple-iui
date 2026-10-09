// security/illustration-svg.hardening.test.ts: property tests for the
// illustration SVG sanitizer: for each hostile family the policy check refuses
// it AND the rebuild leaves nothing that could load or run anything, and every
// id reference in a rebuild lands on an id that exists in that same tree.
import { describe, expect, it } from 'vitest';
import { ILLUSTRATION_CAPS } from '@ripple-ui/core/manifest';
import { checkIllustrationSvg, sanitizeIllustrationSvg } from './illustration-svg.js';

const wrap = (inner: string, attrs = '') => `<svg viewBox='0 0 100 100'${attrs}>${inner}</svg>`;
const XLINK = ` xmlns:xlink='http://www.w3.org/1999/xlink'`;
const SYNC = /(?:^|[\s;+(-])([A-Za-z_][\w-]*)\.(?=[A-Za-z])/g;

/** Anything in the rebuilt tree that could load, run, or dangle. */
function residue(svg: Element): string[] {
	const out: string[] = [];
	const all = [svg, ...svg.querySelectorAll('*')];
	const ids = new Set(all.map((e) => e.getAttribute('id')).filter((v) => v !== null));
	for (const el of all) {
		const tag = el.localName;
		if (/^(script|style|foreignObject|iframe|object|embed|a|image|feImage|audio|video|canvas)$/i.test(tag)) out.push(`<${tag}>`);
		if (el.namespaceURI !== 'http://www.w3.org/2000/svg') out.push(`<${tag}> ns ${el.namespaceURI}`);
		for (const a of el.attributes) {
			// oxlint-disable-next-line no-control-regex -- matching control characters is the point
			const v = a.value.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
			if (a.namespaceURI !== null) out.push(`${tag}@${a.name} namespaced`);
			if (/^on/i.test(a.localName) || a.localName === 'style') out.push(`${tag}@${a.name}`);
			if (/javascript:|data:|vbscript:|expression\(|url\((?!#)|\\/.test(v)) out.push(`${tag}@${a.name}=${a.value}`);
			if (a.localName === 'href' && (!/^(use|mpath)$/.test(tag) || !a.value.startsWith('#') || !ids.has(a.value.slice(1))))
				out.push(`${tag}@href=${a.value}`);
			if (a.localName === 'attributeName' && /href|^on|style|:/i.test(a.value)) out.push(`${tag}@attributeName=${a.value}`);
			for (const m of a.value.matchAll(/url\(#([^)]*)\)/g)) if (!ids.has(m[1])) out.push(`${tag}@${a.name} dangles`);
			if (a.localName === 'begin' || a.localName === 'end')
				for (const m of a.value.matchAll(SYNC)) if (!ids.has(m[1])) out.push(`${tag}@${a.name} dangles`);
			if (a.localName === 'id' && !/^[A-Za-z0-9_-]+$/.test(a.value)) out.push(`${tag}@id=${a.value}`);
		}
	}
	return out;
}

/** The safe outcome: the check refuses, and the rebuild is null or clean. */
function expectRefused(markup: string) {
	expect(checkIllustrationSvg(markup).ok, markup).toBe(false);
	const out = sanitizeIllustrationSvg(markup, document, 'p-');
	if (out) expect(residue(out), markup).toEqual([]);
}

/** Harmless input: the rebuild is clean whatever the check says. */
function expectCleanRebuild(markup: string) {
	const out = sanitizeIllustrationSvg(markup, document, 'p-');
	if (out) expect(residue(out), markup).toEqual([]);
	return out;
}

const idsOf = (svg: Element) => [...svg.querySelectorAll('[id]')].map((e) => e.id);
const refs = (svg: Element) => [...svg.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((x) => x.value).filter((v) => /#|\.\w/.test(v)));
/** A path `d` of exactly n chars. */
const pathOf = (n: number) => 'M0 0' + ' L1 1'.repeat(Math.ceil((n - 4) / 5)).slice(0, n - 4);

/** A cap: the check refuses and the rebuild renders nothing. */
function nullAndRefused(markup: string) {
	expect(checkIllustrationSvg(markup).ok, markup.slice(0, 120)).toBe(false);
	expect(sanitizeIllustrationSvg(markup, document, 'p-'), markup.slice(0, 120)).toBeNull();
}

describe('1. attributeName is exact and case-sensitive', () => {
	const names = ['HREF', 'Href', 'xlink:href', 'svg:fill', 'Fill', 'FILL', ' fill', 'fill ', 'style', 'onclick', 'id', 'class'];
	it.each(names)('attributeName=%j is refused and dropped', (name) => {
		for (const tag of ['set', 'animate']) {
			const markup = wrap(
				`<rect id='a' width='1'><${tag} attributeName='${name}' to='javascript:alert(1)' values='0;1' dur='1s'/></rect>`,
				`${XLINK} xmlns:svg='http://www.w3.org/2000/svg'`
			);
			expectRefused(markup);
			const out = sanitizeIllustrationSvg(markup, document, 'p-');
			expect(out?.querySelectorAll(tag).length ?? 0).toBe(0);
		}
	});

	it('mixed-case or prefixed attribute NAMES never survive the rebuild', () => {
		const markup = wrap(
			`<use HREF='javascript:x' Href='#a' svg:href='#a' svg:fill='red'/><rect id='a' svg:attributeName='href'/>`,
			` xmlns:svg='http://www.w3.org/2000/svg'`
		);
		expectRefused(markup);
		const use = sanitizeIllustrationSvg(markup, document, 'p-')!.querySelector('use')!;
		expect([...use.attributes].map((a) => a.name)).toEqual([]);
	});

	it('a prefixed attributeName attribute does not smuggle a target past the check', () => {
		expectRefused(wrap(`<rect><set svg:attributeName='href' to='#x'/></rect>`, ` xmlns:svg='http://www.w3.org/2000/svg'`));
	});

	it('attributeType is dropped', () => {
		const out = expectCleanRebuild(wrap(`<rect><animate attributeName='x' attributeType='XML' from='0' to='1' dur='1s'/></rect>`))!;
		const anim = out.querySelector('animate')!;
		expect(anim.hasAttribute('attributeType')).toBe(false);
		expect(anim.getAttribute('attributeName')).toBe('x');
	});
});

describe('2. href is only #id on use/mpath, and only to an id that exists', () => {
	it.each(['animate', 'animateTransform', 'animateMotion', 'set'])('href on <%s> is refused and dropped', (tag) => {
		for (const attr of [`href='#a'`, `xlink:href='#a'`]) {
			const markup = wrap(`<rect id='a'/><rect><${tag} ${attr} attributeName='x' to='1' dur='1s'/></rect>`, XLINK);
			expectRefused(markup);
			const out = sanitizeIllustrationSvg(markup, document, 'p-');
			for (const el of out?.querySelectorAll(tag) ?? []) expect([...el.attributes].some((a) => a.localName === 'href')).toBe(false);
		}
	});

	const BAD: Array<[string, string]> = [
		['leading space', `href=' #a'`],
		['trailing space', `href='#a '`],
		['leading tab ref', `href='&#9;#a'`],
		['leading newline', `href='\n#a'`],
		['%-encoded id', `href='#%61'`],
		['%-encoded hash', `href='%23a'`],
		['missing id', `href='#nope'`],
		['empty fragment', `href='#'`],
		['dotted id', `href='#a.b'`],
		['two forms', `href='#a' xlink:href='#a'`],
		['two forms, different targets', `href='#a' xlink:href='#b'`],
		['remote', `href='http://x/#a'`]
	];
	it.each(BAD)('use and mpath with %s are refused and dropped', (_n, attr) => {
		for (const markup of [
			wrap(`<defs><path id='a' d='M0 0'/><path id='b' d='M1 1'/></defs><use ${attr}/>`, XLINK),
			wrap(`<defs><path id='a' d='M0 0'/><path id='b' d='M1 1'/></defs><rect><animateMotion dur='1s'><mpath ${attr}/></animateMotion></rect>`, XLINK)
		]) {
			expectRefused(markup);
			const out = sanitizeIllustrationSvg(markup, document, 'p-');
			for (const el of out?.querySelectorAll('use, mpath') ?? []) expect(el.hasAttribute('href')).toBe(false);
		}
	});

	it('an exact #id to an existing element passes and is prefixed', () => {
		const markup = wrap(`<defs><path id='a' d='M0 0'/></defs><use href='#a'/><use xlink:href='#a'/>`, XLINK);
		expect(checkIllustrationSvg(markup)).toEqual({ ok: true });
		const uses = expectCleanRebuild(markup)!.querySelectorAll('use');
		expect([...uses].map((u) => u.getAttribute('href'))).toEqual(['#p-a', '#p-a']);
	});
});

describe('3. url() is exactly url(#id) to an id that exists', () => {
	const BAD = [
		'url( #a)',
		'url(#a )',
		'url(# a)',
		'url(#a/**/)',
		'url(/**/#a)',
		'url(#a\n)',
		'url(\n#a)',
		' url(#a)',
		'url(#a) ',
		'URL(#a)',
		'Url(#a)',
		'url(#a) url(#a)',
		'url(#a)url(#a)',
		'url(#a) url(http://x)',
		'url(#a), url(#b)',
		"url('#a')",
		'url("#a")',
		'url(#nope)',
		'url(#a.b)',
		'url(http://x#a)',
		'red url(#a)'
	];
	it.each(BAD)('fill=%j is refused and dropped', (value) => {
		for (const attr of ['fill', 'mask', 'clip-path', 'stroke']) {
			const markup = wrap(`<defs><linearGradient id='a'/><linearGradient id='b'/></defs><rect ${attr}='${value}'/>`);
			expectRefused(markup);
			expect(sanitizeIllustrationSvg(markup, document, 'p-')?.querySelector('rect')?.hasAttribute(attr) ?? false).toBe(false);
		}
	});

	it('a url() value inside an animation is held to the same rule', () => {
		expectRefused(wrap(`<rect id='a'><set attributeName='fill' to='url(#a) url(http://x)'/></rect>`));
		expectRefused(wrap(`<rect><animate attributeName='fill' values='url(#a);url(http://x)' dur='1s'/></rect>`));
	});

	it('exact url(#id) to an existing id passes and is prefixed', () => {
		const markup = wrap(`<defs><linearGradient id='a'/></defs><rect fill='url(#a)'/>`);
		expect(checkIllustrationSvg(markup)).toEqual({ ok: true });
		expect(expectCleanRebuild(markup)!.querySelector('rect')!.getAttribute('fill')).toBe('url(#p-a)');
	});
});

describe('4. value checks run on parsed (entity-decoded) values', () => {
	const PROBES = [
		wrap(`<rect fill='&#x75;rl(http://x)'/>`),
		wrap(`<rect fill='&#117;rl(http://x)'/>`),
		wrap(`<rect fill='u&#x72;&#x6c;&#x28;http://x)'/>`),
		wrap(`<rect id='a'><set attributeName='fill' to='&#x6a;avascript:x'/></rect>`),
		wrap(`<rect id='a'><set attributeName='fill' to='&#106;ava&#x09;script:x'/></rect>`),
		wrap(`<rect fill='&#x64;ata:image/png,x'/>`),
		wrap(`<use href='&#x6a;avascript:x'/>`),
		wrap(`<use href='&#x23;a'/><rect id='b'/>`),
		wrap(`<rect><set attributeName='&#x68;ref' to='#a'/></rect>`)
	];
	it.each(PROBES)('%s is refused and neutralised', (markup) => expectRefused(markup));

	it('a decoded url(#id) to an existing id is fine', () => {
		const markup = wrap(`<defs><linearGradient id='a'/></defs><rect fill='&#x75;rl(#a)'/>`);
		expect(checkIllustrationSvg(markup)).toEqual({ ok: true });
		expect(expectCleanRebuild(markup)!.querySelector('rect')!.getAttribute('fill')).toBe('url(#p-a)');
	});
});

describe('5. every id and every reference is rewritten; dangling refs are dropped', () => {
	const ART = wrap(`<defs><linearGradient id='g'/><clipPath id='c'><rect width='9'/></clipPath><path id='route' d='M0 0 L9 9'/></defs>
<rect id='r' fill='url(#g)' clip-path='url(#c)' width='5'>
	<animate id='one' attributeName='x' from='0' to='5' dur='1s' begin='0s;two.end+1s'/>
	<animate id='two' attributeName='y' from='0' to='5' dur='1s' begin='one.begin' end='r.click'/>
	<set attributeName='opacity' to='0.5' begin='one.end' end='two.begin'/>
</rect>
<use href='#r'/>
<rect><animateMotion dur='2s'><mpath href='#route'/></animateMotion></rect>`);

	it('rewrites ids, url(), href and every begin/end syncbase form', () => {
		expect(checkIllustrationSvg(ART)).toEqual({ ok: true });
		const svg = expectCleanRebuild(ART)!;
		const ids = [...svg.querySelectorAll('[id]')].map((e) => e.id).toSorted();
		expect(ids).toEqual(['p-c', 'p-g', 'p-one', 'p-r', 'p-route', 'p-two']);
		const r = svg.querySelector('#p-r')!;
		expect(r.getAttribute('fill')).toBe('url(#p-g)');
		expect(r.getAttribute('clip-path')).toBe('url(#p-c)');
		expect(svg.querySelector('use')!.getAttribute('href')).toBe('#p-r');
		expect(svg.querySelector('mpath')!.getAttribute('href')).toBe('#p-route');
		const anims = svg.querySelectorAll('animate, set');
		expect([...anims].map((a) => [a.getAttribute('begin'), a.getAttribute('end')])).toEqual([
			['0s;p-two.end+1s', null],
			['p-one.begin', 'p-r.click'],
			['p-one.end', 'p-two.begin']
		]);
	});

	it.each([
		['begin', 'ghost.end'],
		['begin', '0s;ghost.begin'],
		['end', 'one.end;ghost.click'],
		['begin', 'one.end+1s;a.b.end']
	])('a %s naming an id not in the SVG (%s) is dropped', (attr, value) => {
		const markup = wrap(`<rect><animate id='one' attributeName='x' to='1' dur='1s'/><animate attributeName='y' to='1' dur='1s' ${attr}='${value}'/></rect>`);
		const svg = expectCleanRebuild(markup)!;
		expect(svg.querySelectorAll('animate')[1].hasAttribute(attr)).toBe(false);
	});

	it.each(["a b", 'a.b', 'a:b', 'a%b', 'a&#x2F;b', 'é', 'a\tb', ''])('an id %j outside [A-Za-z0-9_-] is dropped, and so is every ref to it', (id) => {
		const markup = wrap(`<defs><linearGradient id='${id}'/></defs><rect id='ok' fill='url(#${id})'/><use href='#${id}'/>`);
		const svg = expectCleanRebuild(markup);
		if (!svg) return;
		expect([...svg.querySelectorAll('[id]')].map((e) => e.id)).toEqual(['p-ok']);
		expect(svg.querySelector('rect')!.hasAttribute('fill')).toBe(false);
		expect(svg.querySelector('use')!.hasAttribute('href')).toBe(false);
	});

	it('a reference to an element the rebuild drops is dropped too', () => {
		const svg = expectCleanRebuild(wrap(`<filter id='f'/><image id='i' href='http://x'/><rect fill='url(#f)' mask='url(#i)'/><use href='#i'/>`))!;
		expect(svg.querySelector('rect')!.attributes).toHaveLength(0);
		expect(svg.querySelector('use')!.hasAttribute('href')).toBe(false);
	});

	it('two instances never share an id', () => {
		const a = sanitizeIllustrationSvg(ART, document, 'ill-s1-')!;
		const b = sanitizeIllustrationSvg(ART, document, 'ill-s2-')!;
		expect(idsOf(a).filter((id) => idsOf(b).includes(id))).toEqual([]);
		expect(idsOf(a).every((id) => id.startsWith('ill-s1-'))).toBe(true);
		expect(refs(a).some((v) => v.includes('ill-s2-'))).toBe(false);
	});
});

describe('6. resource caps', () => {
	const { maxNumber, maxListEntries, maxPathChars } = ILLUSTRATION_CAPS;

	it('pins the cap values a server validator copies', () => {
		expect({ maxNumber, maxListEntries, maxPathChars }).toEqual({ maxNumber: 1e6, maxListEntries: 200, maxPathChars: 8000 });
	});

	it.each([
		`<rect width='1000001'/>`,
		`<rect x='-1000001'/>`,
		`<rect width='1e7'/>`,
		`<rect width='1E7'/>`,
		`<rect width='1.5e6'/>`,
		`<rect width='10000000%'/>`,
		`<path d='M0 0 L1e9 0'/>`,
		`<path d='M1e9 0'/>`,
		`<path d='M0,0 2000000,0'/>`,
		`<polygon points='0,0 0,9999999 1,1'/>`,
		`<rect transform='scale(1e9)'/>`,
		`<g transform='translate(0 -2e6)'/>`,
		`<svg viewBox='0 0 1e9 1e9'/>`,
		`<rect stroke-width='1000001'/>`,
		`<rect><animate attributeName='x' values='0;99999999' dur='1s'/></rect>`,
		`<rect><animateTransform attributeName='transform' type='scale' from='1' to='1e8' dur='1s'/></rect>`,
		`<rect><animate attributeName='x' to='1' dur='1e7s'/></rect>`
	])('a number over 1e6 is refused: %s', (inner) => nullAndRefused(wrap(inner)));

	it('numbers at 1e6, small exponents and 8-digit hex colours pass', () => {
		for (const inner of [`<rect width='1000000' x='-1e6' y='1e-9'/>`, `<rect fill='#11223344'/>`, `<path d='M0 0 L1000000 0'/>`])
			expect(checkIllustrationSvg(wrap(inner)), inner).toEqual({ ok: true });
	});

	it.each(['values', 'keyTimes', 'keySplines'])(`a %s list over ${maxListEntries} entries is refused`, (attr) => {
		const entry = attr === 'keySplines' ? '0 0 1 1' : attr === 'keyTimes' ? '0.5' : '1';
		const list = (n: number) => Array.from({ length: n }, () => entry).join(';');
		const anim = (n: number) => wrap(`<rect><animate attributeName='x' ${attr}='${list(n)}' dur='1s'/></rect>`);
		nullAndRefused(anim(maxListEntries + 1));
		expect(checkIllustrationSvg(anim(maxListEntries)).ok).toBe(true);
	});

	it.each([
		['mask referencing itself', `<mask id='m' mask='url(#m)'><rect/></mask><rect mask='url(#m)'/>`],
		['mask content referencing its mask', `<mask id='m'><rect mask='url(#m)'/></mask><rect mask='url(#m)'/>`],
		['clipPath referencing itself', `<clipPath id='c' clip-path='url(#c)'><rect/></clipPath>`],
		['clipPath content referencing its clipPath', `<clipPath id='c'><rect clip-path='url(#c)'/></clipPath>`],
		['mask a -> mask b -> mask a', `<mask id='a'><rect mask='url(#b)'/></mask><mask id='b'><rect mask='url(#a)'/></mask>`],
		['clipPath -> mask -> clipPath', `<clipPath id='c'><rect mask='url(#m)'/></clipPath><mask id='m'><rect clip-path='url(#c)'/></mask>`],
		['mask -> use -> group masked by it', `<mask id='m'><use href='#g'/></mask><g id='g' mask='url(#m)'><rect/></g>`]
	])('%s is refused', (_n, inner) => nullAndRefused(wrap(inner)));

	it('a mask and a clipPath used normally pass', () => {
		expect(checkIllustrationSvg(wrap(`<mask id='m'><rect fill='#fff'/></mask><clipPath id='c'><rect/></clipPath><rect mask='url(#m)' clip-path='url(#c)'/>`))).toEqual({ ok: true });
	});

	it(`a d over ${maxPathChars} chars is refused`, () => {
		expect(pathOf(maxPathChars + 1)).toHaveLength(maxPathChars + 1);
		nullAndRefused(wrap(`<path d='${pathOf(maxPathChars + 1)}'/>`));
		expect(checkIllustrationSvg(wrap(`<path d='${pathOf(maxPathChars)}'/>`)).ok).toBe(true);
	});
});

describe('7. prefixed roots and odd markup carry nothing over', () => {
	const ODD: Array<[string, string]> = [
		['svg:svg root', `<svg:svg xmlns:svg='http://www.w3.org/2000/svg' viewBox='0 0 9 9'><svg:rect width='9' onclick='x'/><svg:script>alert(1)</svg:script></svg:svg>`],
		['svg:svg root with xhtml default ns', `<svg:svg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/1999/xhtml'><script>alert(1)</script><svg:rect/></svg:svg>`],
		['CDATA script in text', wrap(`<text><![CDATA[<script>alert(1)</script>]]></text>`)],
		['CDATA outside text', wrap(`<![CDATA[<image href='http://x'/>]]><rect/>`)],
		['processing instruction', `<?xml-stylesheet href='http://x/a.css'?>` + wrap(`<rect/><?php echo 1 ?>`)],
		['BOM', '﻿' + wrap(`<rect onclick='x'/>`)],
		['duplicate attributes', wrap(`<rect fill='red' fill='url(http://x)'/>`)],
		['duplicate href', wrap(`<use href='#a' href='javascript:x'/><rect id='a'/>`)],
		['xml declaration', `<?xml version='1.0'?>` + wrap(`<rect style='x'/>`)]
	];

	const INERT: Array<[string, string]> = [
		['comment holding markup', wrap(`<!-- <script>alert(1)</script> --><rect/>`)],
		['conditional-comment lookalike', wrap(`<!--[if IE]><image href='http://x'/><![endif]--><rect/>`)],
		['comment inside text', wrap(`<text>a<!-- <image href='http://x'/> -->b</text>`)],
		['PI inside the root', wrap(`<rect/><?php echo 1 ?>`)],
		['plain CDATA in text', wrap(`<text><![CDATA[a & b]]></text>`)]
	];

	it.each(ODD)('%s: refused, and the rebuild is null or clean', (_n, markup) => expectRefused(markup));

	it.each(INERT)('%s: the rebuild is null or clean', (_n, markup) => {
		expectCleanRebuild(markup);
	});

	it('no comment, PI or CDATA node survives a rebuild', () => {
		for (const [, markup] of [...ODD, ...INERT]) {
			const out = sanitizeIllustrationSvg(markup, document, 'p-');
			if (!out) continue;
			const walker = document.createTreeWalker(out, 0xffffffff);
			for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) expect([1, 3]).toContain(n.nodeType);
			expect(out.textContent ?? '').not.toMatch(/<script|<image/);
		}
	});

	it('a clean prefixed root rebuilds unprefixed', () => {
		const markup = `<svg:svg xmlns:svg='http://www.w3.org/2000/svg' viewBox='0 0 9 9'><svg:rect width='9'/></svg:svg>`;
		const out = expectCleanRebuild(markup);
		if (out) expect(out.outerHTML).not.toContain('svg:');
	});
});
