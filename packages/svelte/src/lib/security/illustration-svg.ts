// security/illustration-svg.ts — the two DOM-side halves of the `illustration`
// widget contract (design doc 2026-10-09-ripple-illustration-svg.md); the
// allowlist itself is data in @ripple-ui/core/manifest.
//
// - checkIllustrationSvg: the POLICY check a card policy runs before showing a
//   card. Needs a DOM (browser or jsdom); without DOMParser it refuses. Refuses on the hostile set and the caps; passes harmless unknowns
//   (`filter`, `class`), which the widget drops.
// - sanitizeIllustrationSvg: the WIDGET rebuild. Parses with DOMParser and
//   rebuilds with createElementNS, keeping only allowlisted elements and
//   attributes, and prefixes every id and every reference to one. Never
//   throws, never uses innerHTML. Returns null on a parse error (a streaming
//   partial), a DOCTYPE/ENTITY, or any cap.
//
// Conventions both halves share (and the pocketpaw validator mirrors):
// - A null namespace counts as SVG: `<svg viewBox='..'>` with no xmlns parses
//   to null-namespace elements. Any other non-SVG namespace is hostile.
// - Caps are measured on the parsed source before anything is dropped
//   (measureCaps): every element in every namespace counts, the root is depth
//   1, and `dur` / `repeatCount` are checked only where present.
// - The value rules apply to attribute values, never to text content.
import {
	ILLUSTRATION_ANIMATABLE as ANIMATABLE,
	ILLUSTRATION_ANIMATION_ATTRIBUTES as ANIM_ATTRS,
	ILLUSTRATION_ANIMATION_ELEMENTS as ANIM_ELEMENTS,
	ILLUSTRATION_ATTRIBUTES as ATTRS,
	ILLUSTRATION_CAPS as CAPS,
	ILLUSTRATION_DANGER_TOKENS as DANGER,
	ILLUSTRATION_ELEMENTS as ELEMENTS,
	ILLUSTRATION_ENTITIES as ENTITIES,
	ILLUSTRATION_HOSTILE_ELEMENTS,
	ILLUSTRATION_HREF_ELEMENTS as HREF_ELEMENTS,
	ILLUSTRATION_TRANSFORM_TYPES as TRANSFORM_TYPES
} from '@ripple-ui/core/manifest';

export const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

export type IllustrationCheck = { ok: true } | { ok: false; reason: string };

const HOSTILE = new Set([...ILLUSTRATION_HOSTILE_ELEMENTS].map((n) => n.toLowerCase()));
const TEXT_PARENTS = new Set(['text', 'tspan', 'title', 'desc']);
const ID = '[A-Za-z_][\\w.-]*';
const ID_RE = new RegExp(`^${ID}$`);
const HASH_REF = new RegExp(`^#(${ID})$`);
const URL_REF = new RegExp(`^url\\(#(${ID})\\)$`);
const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]*$/;
// `<id>.<event>` in begin/end: the id part takes no dots (SMIL would need them escaped).
const SYNC_REF = /(^|[\s;+(-])([A-Za-z_][\w-]*)\.(?=[A-Za-z])/g;

/** Strip whitespace and control characters, lowercase: the form danger tokens are matched in. */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const squash = (v: string) => v.replace(/[\s\u0000-\u001f\u007f]+/g, '').toLowerCase();
const isDangerous = (v: string) => {
	const s = squash(v);
	return DANGER.some((t) => s.includes(t));
};
const isSvgNs = (ns: string | null) => ns === null || ns === SVG_NS;

/** The string pre-checks: things a parser must never see. Null when clean. */
function preCheck(markup: string): string | null {
	if (markup.length > CAPS.maxChars) return `markup over ${CAPS.maxChars} chars`;
	if (/<!DOCTYPE/i.test(markup)) return 'DOCTYPE';
	if (/<!ENTITY/i.test(markup)) return 'ENTITY';
	if (/<\?xml-stylesheet/i.test(markup)) return 'xml-stylesheet';
	for (const m of markup.matchAll(/<!\[CDATA\[([\s\S]*?)(?:\]\]>|$)/g)) if (m[1].includes('<')) return 'CDATA with markup';
	for (const m of markup.matchAll(/&([^;\s&<]*);/g)) {
		const name = m[1];
		if (!ENTITIES.has(name) && !/^#\d+$/.test(name) && !/^#x[0-9a-f]+$/i.test(name)) return `entity &${name};`;
	}
	return null;
}

function parse(markup: string): Element | null {
	if (typeof DOMParser === 'undefined') return null;
	try {
		const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
		const root = doc.documentElement;
		if (!root || doc.getElementsByTagName('parsererror').length > 0) return null;
		if (root.localName !== 'svg' || !isSvgNs(root.namespaceURI)) return null;
		return root;
	} catch {
		return null;
	}
}

/** SMIL clock value in seconds; `Infinity` for indefinite/media; NaN when unparseable. */
function clockSeconds(raw: string): number {
	const v = raw.trim();
	if (v === 'indefinite' || v === 'media') return Infinity;
	const full = /^(?:(\d+):)?(\d{1,2}):(\d{2}(?:\.\d+)?)$/.exec(v);
	if (full) return Number(full[1] ?? 0) * 3600 + Number(full[2]) * 60 + Number(full[3]);
	const t = /^(\d+(?:\.\d+)?|\.\d+)(h|min|s|ms)?$/.exec(v);
	if (!t) return NaN;
	const n = Number(t[1]);
	return t[2] === 'h' ? n * 3600 : t[2] === 'min' ? n * 60 : t[2] === 'ms' ? n / 1000 : n;
}

function tooDeep(el: Element, depth: number): boolean {
	if (depth > CAPS.maxDepth) return true;
	for (const c of el.children) if (tooDeep(c, depth + 1)) return true;
	return false;
}

/** The caps, on the parsed source before anything is dropped. Null when within. */
export function measureCaps(root: Element): string | null {
	const all = root.getElementsByTagName('*');
	if (all.length + 1 > CAPS.maxElements) return `over ${CAPS.maxElements} elements`;
	if (tooDeep(root, 1)) return `deeper than ${CAPS.maxDepth}`;
	let anims = 0;
	for (const el of [root, ...all]) {
		if (!ANIM_ELEMENTS.has(el.localName)) continue;
		if (++anims > CAPS.maxAnimations) return `over ${CAPS.maxAnimations} animation elements`;
		const dur = el.getAttribute('dur');
		if (dur !== null) {
			const s = clockSeconds(dur);
			if (!(s >= CAPS.minDurSeconds)) return `dur "${dur}" under ${CAPS.minDurSeconds}s`;
		}
		const rc = el.getAttribute('repeatCount');
		if (rc !== null && rc.trim() !== 'indefinite') {
			const n = Number(rc.trim());
			if (rc.trim() === '' || !Number.isFinite(n) || n < 0 || n > CAPS.maxRepeatCount) return `repeatCount "${rc}"`;
		}
	}
	return null;
}

/** Why one attribute is hostile, or null. Unknown-but-harmless attributes pass. */
function hostileAttr(el: Element, a: Attr): string | null {
	const local = a.localName.toLowerCase();
	if (a.namespaceURI === XMLNS_NS || a.name === 'xmlns') return null;
	if (local.startsWith('on')) return `handler ${a.name}`;
	if (local === 'style') return 'style attribute';
	if (local === 'href') {
		if (!HREF_ELEMENTS.has(el.localName) || !HASH_REF.test(a.value.trim())) return `${a.name} on <${el.localName}>`;
	}
	if (local === 'attributename' && ANIM_ELEMENTS.has(el.localName) && !ANIMATABLE.has(a.value))
		return `animation of "${a.value}"`;
	if (/url\(/i.test(a.value) && !URL_REF.test(a.value.trim())) return `${a.name}="${a.value}"`;
	if (isDangerous(a.value)) return `${a.name}="${a.value}"`;
	return null;
}

/** The policy check: refuse on the hostile set and the caps. */
export function checkIllustrationSvg(markup: string): IllustrationCheck {
	if (typeof markup !== 'string' || !markup.trim()) return { ok: false, reason: 'empty svg' };
	const pre = preCheck(markup);
	if (pre) return { ok: false, reason: pre };
	if (typeof DOMParser === 'undefined') return { ok: false, reason: 'no DOMParser in this runtime (needs a browser or jsdom)' };
	const root = parse(markup);
	if (!root) return { ok: false, reason: 'not a well-formed <svg> document' };
	const cap = measureCaps(root);
	if (cap) return { ok: false, reason: cap };
	for (const el of [root, ...root.getElementsByTagName('*')]) {
		if (!isSvgNs(el.namespaceURI)) return { ok: false, reason: `<${el.localName}> outside the SVG namespace` };
		if (HOSTILE.has(el.localName.toLowerCase())) return { ok: false, reason: `<${el.localName}>` };
		// An animation with no target is inert; one with a target is checked by hostileAttr.
		for (const a of el.attributes) {
			const why = hostileAttr(el, a);
			if (why) return { ok: false, reason: why };
		}
	}
	return { ok: true };
}

/** The value an allowed attribute is rebuilt with, or null to drop it. */
function keepValue(el: Element, a: Attr, prefix: string): string | null {
	const value = a.value;
	// A backslash could be a CSS escape spelling `url(` some other way; no real SVG value needs one.
	if (isDangerous(value) || value.includes('\\')) return null;
	if (/url\(/i.test(value)) {
		const m = URL_REF.exec(value.trim());
		return m ? `url(#${prefix}${m[1]})` : null;
	}
	const name = a.localName;
	if (name === 'id') return ID_RE.test(value) ? prefix + value : null;
	if (name === 'font-family') return FONT_FAMILY.test(value) ? value : null;
	if (name === 'type') return TRANSFORM_TYPES.has(value.trim()) ? value : null;
	if (name === 'begin' || name === 'end') return value.replace(SYNC_REF, (_m, pre, id) => `${pre}${prefix}${id}.`);
	return value;
}

function rebuild(src: Element, doc: Document, prefix: string): Element | null {
	const tag = src.localName;
	if (!isSvgNs(src.namespaceURI) || !ELEMENTS.has(tag)) return null;
	const anim = ANIM_ELEMENTS.has(tag);
	if (anim && !ANIMATABLE.has(src.getAttribute('attributeName') ?? '')) {
		// animateMotion moves along a path and needs no attributeName.
		if (tag !== 'animateMotion' || src.hasAttribute('attributeName')) return null;
	}
	const out = doc.createElementNS(SVG_NS, tag);
	for (const a of src.attributes) {
		const ns = a.namespaceURI;
		const name = a.localName;
		if (name === 'href' && (ns === null || ns === XLINK_NS)) {
			const m = HREF_ELEMENTS.has(tag) ? HASH_REF.exec(a.value.trim()) : null;
			if (m) out.setAttributeNS(null, 'href', `#${prefix}${m[1]}`);
			continue;
		}
		if (ns !== null) continue;
		const allowed = ATTRS.has(name) || (anim && ANIM_ATTRS.has(name));
		if (!allowed || name === 'attributeName' && !anim) continue;
		const v = keepValue(src, a, prefix);
		if (v !== null) out.setAttributeNS(null, name, v);
	}
	for (const c of src.childNodes) {
		if (c.nodeType === 1) {
			const child = rebuild(c as Element, doc, prefix);
			if (child) out.appendChild(child);
		} else if ((c.nodeType === 3 || c.nodeType === 4) && TEXT_PARENTS.has(tag)) {
			out.appendChild(doc.createTextNode(c.nodeValue ?? ''));
		}
	}
	return out;
}

/**
 * The widget rebuild: a fresh SVG element of `doc` holding only the allowlist,
 * every id prefixed with `idPrefix`. Null on a parse error, a DOCTYPE/ENTITY,
 * an oversize string or any cap. Never throws.
 */
export function sanitizeIllustrationSvg(markup: string, doc: Document, idPrefix: string): SVGSVGElement | null {
	try {
		if (typeof markup !== 'string' || markup.length > CAPS.maxChars || /<!(DOCTYPE|ENTITY)/i.test(markup)) return null;
		const root = parse(markup);
		if (!root || measureCaps(root)) return null;
		return rebuild(root, doc, idPrefix) as SVGSVGElement | null;
	} catch {
		return null;
	}
}

/** True when the rebuilt art carries an animation element. */
export function hasAnimation(svg: Element): boolean {
	return [...ANIM_ELEMENTS].some((t) => svg.getElementsByTagNameNS(SVG_NS, t).length > 0);
}
