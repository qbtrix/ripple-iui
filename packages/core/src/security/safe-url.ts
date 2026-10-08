/**
 * @file security/safe-url.ts
 * @description The one URL allowlist for every spec-controlled sink: an href,
 * src, poster, form action, window.open, the `navigate` action, or a CSS
 * url() in a style prop. Specs are model output, and expressions can BUILD a
 * scheme at render time (`{'java'+'script:'}`, `{state.a}:alert(1)`), so the
 * check runs on the final, resolved value, at the sink.
 *
 * Detection runs on a probe: the value with HTML entities and %-escapes
 * decoded once and every whitespace/control char removed, lowercased. The
 * probe is a superset of what a browser normalizes, so if the browser would
 * see `javascript:` the probe does too. The value returned is the trimmed
 * input itself, never the probe, so what we checked is what renders.
 *
 * Invariant: framework-free, no DOM. `headless/purity.test.ts` holds it.
 */

export type SafeUrlKind = 'link' | 'resource';

const LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const RESOURCE_SCHEMES = new Set(['http', 'https']);
const SAFE_DATA_IMAGE = /^data:image\/(png|gif|jpeg|webp)[;,]/;
const NAMED: Record<string, string> = {
	colon: ':', tab: '\t', newline: '\n', sol: '/', bsol: '\\', amp: '&', lpar: '(', rpar: ')', quot: '"', apos: "'"
};

function cp(n: number): string {
	try {
		return String.fromCodePoint(n);
	} catch {
		return '';
	}
}

function probe(raw: string): string {
	return raw
		.replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => cp(parseInt(h, 16)))
		.replace(/&#(\d+);?/g, (_, d: string) => cp(parseInt(d, 10)))
		.replace(/&([a-z]+);/gi, (m, n: string) => NAMED[n.toLowerCase()] ?? m)
		.replace(/%([0-9a-f]{2})/gi, (_, h: string) => cp(parseInt(h, 16)))
		.replace(/[\u0000- \u007f-\u009f\s]+/g, '')
		.replace(/\\/g, '/')
		.toLowerCase();
}

/**
 * Return `value` if it is safe for the sink, else a fallback.
 *
 * - `link` (default; href, form action, window.open, navigate): relative
 *   paths (`/x`, `./x`, `?q`, `#h`, `//host`), http, https, mailto, tel.
 *   Anything else is `undefined`: the sink drops the attribute, leaving an
 *   inert `<a>` (a `'#'` fallback would open a copy of the page under
 *   `target=_blank`).
 * - `resource` (src, poster, CSS url()): relative paths except
 *   protocol-relative `//host` (it inherits the page scheme, so on a `file:`
 *   host it reads local files), http, https, and `data:image/(png|gif|jpeg|webp)`.
 *   SVG data is refused (it can carry script). Anything else is `undefined`,
 *   which a renderer turns into "no attribute".
 *
 * Empty or non-string input is `undefined` too, so blocked and absent look
 * the same to every sink.
 */
export function safeUrl(value: unknown, opts: { kind?: SafeUrlKind } = {}): string | undefined {
	if (typeof value !== 'string') return undefined;
	const url = value.trim();
	if (url === '') return undefined;
	const link = (opts.kind ?? 'link') === 'link';
	const p = probe(url);
	const scheme = /^([a-z][a-z0-9+.-]*):/.exec(p)?.[1];
	if (scheme === undefined) return link || !p.startsWith('//') ? url : undefined;
	if (!link && scheme === 'data') return SAFE_DATA_IMAGE.test(p) ? url : undefined;
	return (link ? LINK_SCHEMES : RESOURCE_SCHEMES).has(scheme) ? url : undefined;
}

const CSS_PROP = /^-{0,2}[a-z][a-z0-9-]*$/i;
const CSS_SCRIPT = /expression\(|-moz-binding|behavior:|javascript:|vbscript:|@import/;
// Functions that fetch a resource. `image(` also matches `-webkit-image(`;
// `image-set(` and `cross-fade(` match their `-webkit-` forms.
const CSS_RESOURCE = /url\(|image-set\(|image\(|cross-fade\(|element\(|src\(/;

function cssProbe(v: string): string {
	return v
		.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h: string) => cp(parseInt(h, 16)))
		.replace(/\\(.)/g, '$1')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.toLowerCase();
}

function safeDeclaration(prop: string, value: unknown): boolean {
	if (!CSS_PROP.test(prop.trim())) return false;
	const v = cssProbe(String(value));
	const flat = v.replace(/\s+/g, '');
	if (CSS_SCRIPT.test(flat)) return false;
	// A var() inside a resource function hides its target in another
	// declaration (`--a:"//evil"` + `image-set(var(--a) 1x)`): refuse outright.
	if (CSS_RESOURCE.test(flat) && flat.includes('var(')) return false;
	// Every quoted string is checked, in every declaration, custom properties
	// included: any of them can reach a resource function through var().
	const targets = [
		...[...v.matchAll(/url\(\s*(['"]?)([^'")]*)/g)].map((m) => m[2]),
		...[...v.matchAll(/(['"])(.*?)\1/g)].map((m) => m[2])
	];
	return targets.every((t) => t.trim() === '' || safeUrl(t, { kind: 'resource' }) !== undefined);
}

/** Split a declaration list on `;` outside quotes and ()/[]/{} blocks, as a CSS parser does. */
function declarations(css: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let quote = '';
	let start = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === '\\') i++;
		else if (quote) quote = c === quote ? '' : quote;
		else if (c === '"' || c === "'") quote = c;
		else if ('([{'.includes(c)) depth++;
		else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
		else if (c === ';' && depth === 0) {
			out.push(css.slice(start, i));
			start = i + 1;
		}
	}
	out.push(css.slice(start));
	return out;
}

/**
 * Drop style declarations that could load or run something unsafe: a
 * resource function (url(), image-set(), image(), cross-fade(), element())
 * whose target fails `safeUrl(…, { kind: 'resource' })` or comes through
 * var(), any quoted string that fails the same check, `expression(`,
 * `-moz-binding`, `@import`, or a property name that is not a plain CSS
 * identifier (a key like `color:red;background` would inject a declaration).
 * Accepts the record form widgets join themselves, or a declaration string,
 * which is split the way a CSS parser splits it (so `url(data:…;base64,…)`
 * stays whole).
 */
export function safeStyle(style: string): string;
export function safeStyle<V>(style: Record<string, V>): Record<string, V>;
export function safeStyle<T>(style: T): T;
export function safeStyle(style: unknown): unknown {
	if (typeof style === 'string') {
		return declarations(style)
			.map((d) => d.trim())
			.filter((d) => {
				const i = d.indexOf(':');
				return i > 0 && safeDeclaration(d.slice(0, i), d.slice(i + 1));
			})
			.join('; ');
	}
	if (style && typeof style === 'object' && !Array.isArray(style)) {
		return Object.fromEntries(Object.entries(style).filter(([k, v]) => safeDeclaration(k, v)));
	}
	return style;
}
