// security/illustration-svg.ts — the two DOM-side halves of the `illustration`
// widget contract (design doc 2026-10-09-ripple-illustration-svg.md); the
// allowlist itself is data in @ripple-ui/core/manifest.
//
// - checkIllustrationSvg: the POLICY check a card policy runs before showing a
//   card. Needs a DOM (browser or jsdom); without DOMParser it refuses. Refuses on the hostile set and the caps; passes harmless unknowns
//   (`filter`, `class`), which the widget drops.
// - sanitizeIllustrationSvg: the WIDGET rebuild. Parses with DOMParser and
//   rebuilds with createElementNS, keeping only allowlisted elements and
//   attributes and plain text inside text/tspan/title/desc (no CDATA,
//   comment or PI), and prefixes every id and every reference to one. Never
//   throws, never uses innerHTML. Returns null on a parse error (a streaming
//   partial), a DOCTYPE/ENTITY, or any cap.
//
// Conventions both halves share (and the pocketpaw validator mirrors):
// - A null namespace counts as SVG: `<svg viewBox='..'>` with no xmlns parses
//   to null-namespace elements. Any other non-SVG namespace is hostile.
// - Caps are measured on the parsed source before anything is dropped
//   (measureCaps): every element in every namespace counts, the root is depth
//   1, and `dur` / `repeatCount` are checked only where present. At most
//   maxUse `use` elements, and no `use` may point at a `use` or at a subtree
//   holding one (nested or self-referencing use), so fan-out stays bounded.
//   No number in a kept attribute over maxNumber, no values/keyTimes/keySplines
//   list over maxListEntries, no `d`/`path` over maxPathChars, and no mask or
//   clipPath that reaches itself through mask / clip-path / href refs.
// - The value rules apply to attribute values (as parsed, entities decoded),
//   never to text content. Refs are exact: `href='#id'` and `url(#id)`, no
//   trimming, and the id must exist (in the source for the check, in the
//   rebuilt tree for the rebuild, which drops any href / url() / begin / end
//   naming a missing id). Ids are `[A-Za-z_][A-Za-z0-9_-]*`; others are dropped.
// - One `href` per element: two forms (`href` + `xlink:href`) are refused.
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
const ID = '[A-Za-z0-9_-]+';
const ID_RE = new RegExp(`^${ID}$`);
const HASH_REF = new RegExp(`^#(${ID})$`);
const URL_REF = new RegExp(`^url\\(#(${ID})\\)$`);
const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]*$/;
// `<id>.<event>` in begin/end: the id part takes no dots (SMIL would need them escaped).
const SYNC_REF = /(^|[\s;+(-])([A-Za-z0-9_-]+)\.(?=[A-Za-z])/g;
const NUMBER = /\d*\.?\d+(?:e[-+]?\d+)?/gi;
const NO_NUMBER_SCAN = new Set(['id', 'font-family', 'begin', 'end']);
const LISTS = new Set(['values', 'keyTimes', 'keySplines']);

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
	if (markup.includes('<![CDATA[')) return 'CDATA section';
	// Only a leading XML declaration may use <? ... ?>; the server refuses every other processing instruction.
	if (/<\?/.test(markup.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>/, ''))) return 'processing instruction';
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
		const attrCap = attrCaps(el);
		if (attrCap) return attrCap;
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
	return useFanOut(root, all) ?? maskCycle([root, ...all]);
}

/** The per-attribute caps (numbers, list lengths, path length) on the attributes the rebuild keeps. */
function attrCaps(el: Element): string | null {
	for (const a of el.attributes) {
		const name = a.localName;
		if (a.namespaceURI !== null || !(ATTRS.has(name) || ANIM_ATTRS.has(name))) continue;
		if ((name === 'd' || name === 'path') && a.value.length > CAPS.maxPathChars) return `${name} over ${CAPS.maxPathChars} chars`;
		if (LISTS.has(name) && a.value.split(';').filter((s) => s.trim()).length > CAPS.maxListEntries)
			return `${name} over ${CAPS.maxListEntries} entries`;
		if (NO_NUMBER_SCAN.has(name)) continue;
		for (const m of a.value.replace(/#[\w-]*/g, ' ').matchAll(NUMBER))
			if (Math.abs(Number(m[0])) > CAPS.maxNumber) return `${name} number ${m[0]} over ${CAPS.maxNumber}`;
	}
	return null;
}

/** A mask or clipPath that reaches itself through mask / clip-path / href refs, any number of hops. */
function maskCycle(els: Element[]): string | null {
	const byId = new Map<string, Element>();
	for (const el of els) {
		const id = el.getAttribute('id');
		if (id !== null && !byId.has(id)) byId.set(id, el);
	}
	const memo = new Map<Element, string[]>();
	const refsOf = (el: Element): string[] => {
		let out = memo.get(el);
		if (out) return out;
		out = [];
		for (const e of [el, ...el.getElementsByTagName('*')])
			for (const a of e.attributes) {
				const n = a.localName;
				const m = n === 'href' ? HASH_REF.exec(a.value.trim()) : n === 'mask' || n === 'clip-path' ? /url\(\s*#([^)\s]+)/.exec(a.value) : null;
				if (m) out.push(m[1]);
			}
		memo.set(el, out);
		return out;
	};
	for (const start of els) {
		const id = start.getAttribute('id');
		if ((start.localName !== 'mask' && start.localName !== 'clipPath') || id === null) continue;
		const seen = new Set<string>();
		const queue = [...refsOf(start)];
		while (queue.length) {
			const x = queue.pop()!;
			if (x === id) return `${start.localName} #${id} references itself`;
			if (seen.has(x)) continue;
			seen.add(x);
			const target = byId.get(x);
			if (target) queue.push(...refsOf(target));
		}
	}
	return null;
}

/** The `use` cap: at most maxUse, and none pointing at a `use` or a subtree holding one. */
function useFanOut(root: Element, all: HTMLCollectionOf<Element>): string | null {
	const els = [root, ...all];
	const uses = els.filter((el) => el.localName === 'use' && isSvgNs(el.namespaceURI));
	if (uses.length > CAPS.maxUse) return `over ${CAPS.maxUse} use elements`;
	if (!uses.length) return null;
	const byId = new Map<string, Element>();
	for (const el of els) {
		const id = el.getAttribute('id');
		if (id !== null && !byId.has(id)) byId.set(id, el);
	}
	for (const u of uses)
		for (const a of u.attributes) {
			if (a.localName !== 'href' || (a.namespaceURI !== null && a.namespaceURI !== XLINK_NS)) continue;
			const m = HASH_REF.exec(a.value.trim());
			const target = m ? byId.get(m[1]) : undefined;
			if (target && (target.localName === 'use' || uses.some((x) => x !== target && target.contains(x))))
				return `nested use (#${m![1]})`;
		}
	return null;
}

/** True when `value` is exactly the ref form `re` and names an id in `ids`. */
const refTo = (re: RegExp, value: string, ids: Set<string>) => {
	const m = re.exec(value);
	return m !== null && ids.has(m[1]);
};

/** Why one attribute is hostile, or null. Unknown-but-harmless attributes pass. */
function hostileAttr(el: Element, a: Attr, ids: Set<string>): string | null {
	const local = a.localName.toLowerCase();
	if (a.namespaceURI === XMLNS_NS || a.name === 'xmlns') return null;
	if (local.startsWith('on')) return `handler ${a.name}`;
	if (local === 'style') return 'style attribute';
	if (local === 'attributetype') return 'attributeType';
	if (a.value.includes('\\')) return `backslash in ${a.name}`;
	if (local === 'id' && !/^[A-Za-z0-9_-]+$/.test(a.value)) return `id "${a.value}"`;
	if (local === 'begin' || local === 'end') {
		for (const m of a.value.matchAll(SYNC_REF)) if (!ids.has(m[2])) return `${a.name} names missing #${m[2]}`;
	}
	if (local === 'href') {
		if (!HREF_ELEMENTS.has(el.localName) || !refTo(HASH_REF, a.value, ids)) return `${a.name}="${a.value}" on <${el.localName}>`;
	}
	if (local === 'attributename' && ANIM_ELEMENTS.has(el.localName) && !ANIMATABLE.has(a.value))
		return `animation of "${a.value}"`;
	if (/url\(/i.test(a.value) && !refTo(URL_REF, a.value, ids)) return `${a.name}="${a.value}"`;
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
	const els = [root, ...root.getElementsByTagName('*')];
	const ids = new Set(els.map((el) => el.getAttribute('id')).filter((id) => id !== null));
	for (const el of els) {
		if (!isSvgNs(el.namespaceURI)) return { ok: false, reason: `<${el.localName}> outside the SVG namespace` };
		if ([...el.attributes].filter((a) => a.localName.toLowerCase() === 'href').length > 1) return { ok: false, reason: `two hrefs on <${el.localName}>` };
		if (HOSTILE.has(el.localName.toLowerCase())) return { ok: false, reason: `<${el.localName}>` };
		// An animation with no target is inert; one with a target is checked by hostileAttr.
		for (const a of el.attributes) {
			const why = hostileAttr(el, a, ids);
			if (why) return { ok: false, reason: why };
		}
	}
	return { ok: true };
}

/** The value an allowed attribute is rebuilt with, or null to drop it. */
function keepValue(el: Element, a: Attr, prefix: string, refs: string[]): string | null {
	const value = a.value;
	// A backslash could be a CSS escape spelling `url(` some other way; no real SVG value needs one.
	if (isDangerous(value) || value.includes('\\')) return null;
	if (/url\(/i.test(value)) {
		const m = URL_REF.exec(value);
		if (m) refs.push(m[1]);
		return m ? `url(#${prefix}${m[1]})` : null;
	}
	const name = a.localName;
	if (name === 'id') return ID_RE.test(value) ? prefix + value : null;
	if (name === 'font-family') return FONT_FAMILY.test(value) ? value : null;
	if (name === 'type') return TRANSFORM_TYPES.has(value.trim()) ? value : null;
	if (name === 'begin' || name === 'end')
		return value.replace(SYNC_REF, (_m, pre, id) => {
			refs.push(id);
			return `${pre}${prefix}${id}.`;
		});
	return value;
}

/** A rebuilt attribute and the source ids it names; dropped after the rebuild if one is missing. */
type PendingRef = [el: Element, name: string, ids: string[]];

function rebuild(src: Element, doc: Document, prefix: string, pending: PendingRef[]): Element | null {
	const tag = src.localName;
	if (!isSvgNs(src.namespaceURI) || !ELEMENTS.has(tag)) return null;
	const anim = ANIM_ELEMENTS.has(tag);
	if (anim && !ANIMATABLE.has(src.getAttribute('attributeName') ?? '')) {
		// animateMotion moves along a path and needs no attributeName.
		if (tag !== 'animateMotion' || src.hasAttribute('attributeName')) return null;
	}
	const out = doc.createElementNS(SVG_NS, tag);
	const hrefs = [...src.attributes].filter((a) => a.localName === 'href' && (a.namespaceURI === null || a.namespaceURI === XLINK_NS));
	for (const a of src.attributes) {
		const ns = a.namespaceURI;
		const name = a.localName;
		if (name === 'href' && (ns === null || ns === XLINK_NS)) {
			const m = HREF_ELEMENTS.has(tag) && hrefs.length === 1 ? HASH_REF.exec(a.value) : null;
			if (m) {
				out.setAttributeNS(null, 'href', `#${prefix}${m[1]}`);
				pending.push([out, 'href', [m[1]]]);
			}
			continue;
		}
		if (ns !== null) continue;
		const allowed = ATTRS.has(name) || (anim && ANIM_ATTRS.has(name));
		if (!allowed || name === 'attributeName' && !anim) continue;
		const refs: string[] = [];
		const v = keepValue(src, a, prefix, refs);
		if (v === null) continue;
		out.setAttributeNS(null, name, v);
		if (refs.length) pending.push([out, name, refs]);
	}
	for (const c of src.childNodes) {
		if (c.nodeType === 1) {
			const child = rebuild(c as Element, doc, prefix, pending);
			if (child) out.appendChild(child);
		} else if (c.nodeType === 3 && TEXT_PARENTS.has(tag)) {
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
		const pending: PendingRef[] = [];
		const out = rebuild(root, doc, idPrefix, pending);
		if (!out) return null;
		const kept = new Set([out, ...out.querySelectorAll('[id]')].map((el) => el.getAttribute('id')));
		for (const [el, name, ids] of pending) if (ids.some((id) => !kept.has(idPrefix + id))) el.removeAttribute(name);
		return out as SVGSVGElement;
	} catch {
		return null;
	}
}

/** True when the rebuilt art carries an animation element. */
export function hasAnimation(svg: Element): boolean {
	return [...ANIM_ELEMENTS].some((t) => svg.getElementsByTagNameNS(SVG_NS, t).length > 0);
}
