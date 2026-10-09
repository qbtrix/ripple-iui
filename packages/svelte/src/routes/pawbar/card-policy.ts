// routes/pawbar/card-policy.ts — The landing's client-side check on model-made chat cards.
// A second layer behind the server's own card validation, and the only one while
// a card streams (the server validates at the end). `refuseCard` walks the whole
// card, ui AND state, and returns a reason to refuse it, or null. The site's CSP
// (svelte.config.js) is the backstop behind this.
//   1. A card is `{ui, state?}` (plus the `version` the client adds).
//   2. Every `action` is a local one (set, toggle, push, remove, open) or `emit`
//      (inert on the landing). Four more add no reach and pass: `flow` and
//      `branch` only sequence or choose steps, which are walked by these same
//      rules; `validate` reads local state; `toast` only shows a message.
//   3. Widget nodes (the ui root, every `children` element, and any object whose
//      `type` the renderer would resolve, aliases included) must use a type from
//      CHAT_WIDGET_TYPES: the manifest's canonical names minus embed,
//      ripple-frame, richtext, rich-text, map and company-header. An alias
//      (iframe, frame, ...) is refused.
//   4. URL-ish keys (href, src, imageUrl, iconSrc, target, ...): no `{` at all, so
//      an expression can never assemble a URL; otherwise https or relative. One
//      exception: the `target` of an object whose exact `action` is in
//      PATH_TARGET_ACTIONS is a state path (`stops.{index}.done`), modal id or
//      event name, never a URL, so it takes rule 5 instead. `navigate` reads its
//      `target` as the URL, so it must never join that list.
//   5. Every other string: no javascript:/vbscript:/data: URL, no CSS url(), no
//      markup or markdown image/link (`![`, `<img`, `<a`, `<svg`, `<details`,
//      `](https:`, any tag with an on*= handler), and no bare http(s) or www.
//      link. Markdown widgets render any string they get.
// Rules 4 and 5 read strings after one pass of HTML character-reference
// decoding (`&lt;`, `&#60;`, `&#x3c;`), the form a markdown or HTML sink sees.
// This walks the card only; /live's recorded replays never pass through it.
// `partial` is for specs still streaming: a name that is a prefix of an allowed
// action, widget type or card key is not refused yet.

import { getWidget } from '$lib/widgets/index.js';
import { CHAT_WIDGET_TYPES } from './widget-types.js';

export const ALLOWED_ACTIONS = ['set', 'toggle', 'push', 'remove', 'open', 'emit', 'flow', 'branch', 'validate', 'toast'] as const;
const CARD_KEYS = ['version', 'ui', 'state'];
/** Actions whose `target` the engine reads as a state path, modal id or event name. Never `navigate`. */
export const PATH_TARGET_ACTIONS: readonly string[] = ['set', 'toggle', 'push', 'remove', 'open', 'emit', 'flow', 'branch', 'validate', 'toast'];
const URL_KEY = /(href|url|uri|src|srcset|link|image|img|avatar|icon|favicon|poster|cover|background|action|target)$/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const SCRIPT_URL = /^(javascript|vbscript):/i;
const DATA_URL = /^data:[\w.+-]*\/?[\w.+-]*(;[\w.+=-]+)*,/i;
const STYLE_URL = /url\s*\(/i;
const MARKUP =
	/!\[|<\s*\/?\s*(img|a|iframe|frame|script|object|embed|svg|math|details|link|meta|style|form|base|video|audio|source)\b/i;
/** A tag carrying an event-handler attribute. Bounded so a long run of `<x` stays linear. */
const EVENT_ATTR = /<[a-z][^<>]{0,1000}?[\s/"']on[a-z]+\s*=/i;
const ENTITY = /&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos|colon|sol|tab|newline);?/gi;
const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", colon: ':', sol: '/', tab: '\t', newline: '\n' };
const MD_LINK = /\]\(\s*<?\s*([a-z][a-z0-9+.-]*:|\/\/|\\)/i;
const BARE_LINK = /(https?:\/\/|\bwww\.)/i;
const MAX_NODES = 50_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** What a browser reads as the URL: leading controls dropped, tabs/newlines removed, `\` as `/`. */
// eslint-disable-next-line no-control-regex
const asUrl = (v: string) => v.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '').replaceAll('\\', '/');

/** One pass of character-reference decoding, as an HTML parser does before it reads tags. */
export function decodeEntities(v: string): string {
	return v.replace(ENTITY, (m, ref: string) => {
		const r = ref.toLowerCase();
		if (!r.startsWith('#')) return NAMED[r] ?? m;
		const n = r[1] === 'x' ? parseInt(r.slice(2), 16) : parseInt(r.slice(1), 10);
		return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
	});
}

const allowed = (list: readonly string[], name: string, partial: boolean) =>
	list.some((a) => a === name || (partial && a.startsWith(name)));

function urlRefusal(raw: string): string | null {
	if (raw.includes('{')) return 'expression_url';
	const value = decodeEntities(raw);
	if (STYLE_URL.test(value)) return 'style_url';
	const u = asUrl(value);
	if (u.startsWith('//')) return 'unsafe_url';
	if (SCHEME.test(u) && !/^https:/i.test(u)) return 'unsafe_url';
	return null;
}

function textRefusal(raw: string): string | null {
	const value = decodeEntities(raw);
	const u = asUrl(value);
	if (SCRIPT_URL.test(u) || DATA_URL.test(u)) return 'unsafe_url';
	if (STYLE_URL.test(value)) return 'style_url';
	if (MARKUP.test(value) || EVENT_ATTR.test(value) || MD_LINK.test(value) || BARE_LINK.test(value)) return 'markup';
	return null;
}

const typeNames = [...CHAT_WIDGET_TYPES];

export function refuseCard(card: unknown, { partial = false } = {}): string | null {
	if (!isRecord(card)) return 'invalid';
	const stack: [value: unknown, key: string, isNode: boolean][] = [];
	for (const [key, value] of Object.entries(card)) {
		if (!allowed(CARD_KEYS, key, partial)) return `key:${key}`;
		stack.push([value, key, key === 'ui']);
	}
	for (let seen = 0; stack.length; seen++) {
		if (seen > MAX_NODES) return 'too_large';
		const [node, key, isNode] = stack.pop()!;
		if (typeof node === 'string') {
			const why = URL_KEY.test(key) ? urlRefusal(node) : textRefusal(node);
			if (why) return why;
			continue;
		}
		if (Array.isArray(node)) {
			for (const item of node) stack.push([item, key, key === 'children']);
			continue;
		}
		if (!isRecord(node)) continue;
		const type = node.type;
		if (typeof type === 'string' && (isNode || getWidget(type)) && !CHAT_WIDGET_TYPES.has(type)) {
			if (!(partial && isNode && typeNames.some((t) => t.startsWith(type)))) return `widget:${type}`;
		}
		const pathTarget = typeof node.action === 'string' && allowed(PATH_TARGET_ACTIONS, node.action, partial);
		for (const [k, v] of Object.entries(node)) {
			if (k.toLowerCase() === 'action' && typeof v === 'string') {
				if (!allowed(ALLOWED_ACTIONS, v, partial)) return `action:${v}`;
				continue;
			}
			// A state action's target is checked as text (rule 5), not as a URL.
			stack.push([v, pathTarget && k === 'target' ? 'path' : k, false]);
		}
	}
	return null;
}
