// routes/pawbar/card-policy.ts — The landing's client-side check on model-made chat cards.
// A second layer behind the server's own card validation: `refuseCard` walks the
// whole card (ui AND state) and returns a reason to refuse it, or null.
//   1. Every `action` must be a local one (set, toggle, push, remove, open) or
//      `emit`, which the landing treats as inert. Four more pass because they
//      add no reach: `flow` and `branch` only sequence or choose steps, and
//      every step is walked by these same rules; `validate` checks a condition
//      against local state;
//      `toast` only shows a message, which the landing's host handler records.
//      Without them 7 of the 9 recorded cards would be refused. Nothing else
//      (api, navigate, confirm, run_source, form posts, ...) at any depth.
//   2. No `embed`, `ripple-frame` or `richtext` widget, anywhere.
//   3. URL-bearing keys (src, href, url, image, ...) must be https, relative or a
//      `{expression}`; and no string anywhere may be a javascript:, vbscript: or
//      data: URL. ponytail: an `{expression}` URL is allowed because the state it
//      reads is walked by the same rules; a plain http URL kept under a non-URL
//      state key and pulled in by expression is not caught. Resolve and recheck
//      at render time if that ever matters.
//   4. A card is `{ui, state?}` (plus the `version` the client adds): any other
//      top-level key (`data` sources that fetch on mount, `theme`, ...) refuses it.
// `partial` is for specs still streaming: an action name that is a prefix of an
// allowed one ("se" on the way to "set") is not refused yet.

export const ALLOWED_ACTIONS = ['set', 'toggle', 'push', 'remove', 'open', 'emit', 'flow', 'branch', 'validate', 'toast'] as const;
export const BLOCKED_WIDGETS = new Set(['embed', 'ripple-frame', 'richtext']);
const URL_KEYS = new Set(['src', 'href', 'url', 'image', 'avatar', 'favicon', 'poster', 'cover', 'tile', 'background', 'link', 'action']);
const SCRIPT_URL = /^(javascript|vbscript):/i;
const DATA_URL = /^data:[\w.+-]*\/?[\w.+-]*(;[\w.+=-]+)*,/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const CARD_KEYS = ['version', 'ui', 'state'];
const MAX_NODES = 50_000;

/** What a browser would read as the URL: leading controls/spaces dropped, tabs and newlines removed anywhere. */
// eslint-disable-next-line no-control-regex
const asUrl = (v: string) => v.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '');

const isScriptOrData = (v: string) => {
	const u = asUrl(v);
	return SCRIPT_URL.test(u) || DATA_URL.test(u);
};

function urlAllowed(v: string): boolean {
	const u = asUrl(v);
	if (u.startsWith('{')) return true;
	if (u.startsWith('//') || u.startsWith('\\')) return false;
	return !SCHEME.test(u) || /^https:/i.test(u);
}

function actionAllowed(name: string, partial: boolean): boolean {
	return ALLOWED_ACTIONS.some((a) => a === name || (partial && a.startsWith(name)));
}

export function refuseCard(card: unknown, { partial = false } = {}): string | null {
	if (card && typeof card === 'object' && !Array.isArray(card)) {
		for (const key of Object.keys(card)) {
			if (!CARD_KEYS.some((k) => k === key || (partial && k.startsWith(key)))) return `key:${key}`;
		}
	}
	const stack: unknown[] = [card];
	for (let seen = 0; stack.length; seen++) {
		if (seen > MAX_NODES) return 'too_large';
		const node = stack.pop();
		if (typeof node === 'string') {
			if (isScriptOrData(node)) return 'unsafe_url';
			continue;
		}
		if (!node || typeof node !== 'object') continue;
		if (Array.isArray(node)) {
			stack.push(...(node as unknown[]));
			continue;
		}
		for (const [key, value] of Object.entries(node)) {
			if (typeof value === 'string') {
				const k = key.toLowerCase();
				if (k === 'action' && !actionAllowed(value, partial)) return `action:${value}`;
				if (k === 'type' && BLOCKED_WIDGETS.has(value)) return `widget:${value}`;
				if (URL_KEYS.has(k) && !urlAllowed(value)) return `unsafe_url:${key}`;
			}
			stack.push(value);
		}
	}
	return null;
}
