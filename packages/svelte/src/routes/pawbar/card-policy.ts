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
//      ripple-frame and richtext. An alias (iframe, frame, ...) is refused.
//   4. URL-ish keys (href, src, imageUrl, iconSrc, target, ...): no `{` at all, so
//      an expression can never assemble a URL; otherwise https or relative.
//   5. Every other string: no javascript:/vbscript:/data: URL, no CSS url(), no
//      markup or markdown image/link (`![`, `<img`, `<a`, `](https:`), and no
//      bare http(s) or www. link. Markdown widgets render any string they get.
// `partial` is for specs still streaming: a name that is a prefix of an allowed
// action, widget type or card key is not refused yet.

import { getWidget } from '$lib/widgets/index.js';
import { CHAT_WIDGET_TYPES } from './widget-types.js';

export const ALLOWED_ACTIONS = ['set', 'toggle', 'push', 'remove', 'open', 'emit', 'flow', 'branch', 'validate', 'toast'] as const;
const CARD_KEYS = ['version', 'ui', 'state'];
const URL_KEY = /(href|url|uri|src|srcset|link|image|img|avatar|icon|favicon|poster|cover|background|action|target)$/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const SCRIPT_URL = /^(javascript|vbscript):/i;
const DATA_URL = /^data:[\w.+-]*\/?[\w.+-]*(;[\w.+=-]+)*,/i;
const STYLE_URL = /url\s*\(/i;
const MARKUP = /!\[|<\s*\/?\s*(img|a|iframe|frame|script|object|embed|svg|link|meta|style|form|base|video|audio|source)\b/i;
const MD_LINK = /\]\(\s*<?\s*([a-z][a-z0-9+.-]*:|\/\/|\\)/i;
const BARE_LINK = /(https?:\/\/|\bwww\.)/i;
const MAX_NODES = 50_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** What a browser reads as the URL: leading controls dropped, tabs/newlines removed, `\` as `/`. */
// eslint-disable-next-line no-control-regex
const asUrl = (v: string) => v.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '').replaceAll('\\', '/');

const allowed = (list: readonly string[], name: string, partial: boolean) =>
	list.some((a) => a === name || (partial && a.startsWith(name)));

function urlRefusal(value: string): string | null {
	if (value.includes('{')) return 'expression_url';
	if (STYLE_URL.test(value)) return 'style_url';
	const u = asUrl(value);
	if (u.startsWith('//')) return 'unsafe_url';
	if (SCHEME.test(u) && !/^https:/i.test(u)) return 'unsafe_url';
	return null;
}

function textRefusal(value: string): string | null {
	const u = asUrl(value);
	if (SCRIPT_URL.test(u) || DATA_URL.test(u)) return 'unsafe_url';
	if (STYLE_URL.test(value)) return 'style_url';
	if (MARKUP.test(value) || MD_LINK.test(value) || BARE_LINK.test(value)) return 'markup';
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
		for (const [k, v] of Object.entries(node)) {
			if (k.toLowerCase() === 'action' && typeof v === 'string') {
				if (!allowed(ALLOWED_ACTIONS, v, partial)) return `action:${v}`;
				continue;
			}
			stack.push([v, k, false]);
		}
	}
	return null;
}
