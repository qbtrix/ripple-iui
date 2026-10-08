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
 *   Anything else becomes `'#'`.
 * - `resource` (src, poster, CSS url()): relative paths except
 *   protocol-relative `//host` (it inherits the page scheme, so on a `file:`
 *   host it reads local files), http, https, and `data:image/(png|gif|jpeg|webp)`.
 *   SVG data is refused (it can carry script). Anything else is `undefined`,
 *   which a renderer turns into "no attribute".
 *
 * Empty or non-string input is `undefined` for both kinds, so an absent link
 * stays absent rather than becoming `'#'`.
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
	if ((link ? LINK_SCHEMES : RESOURCE_SCHEMES).has(scheme)) return url;
	return link ? '#' : undefined;
}

const CSS_PROP = /^-{0,2}[a-z][a-z0-9-]*$/i;
const CSS_SCRIPT = /expression\(|-moz-binding|behavior:|javascript:|vbscript:/;

function cssProbe(v: string): string {
	return v
		.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h: string) => cp(parseInt(h, 16)))
		.replace(/\\(.)/g, '$1')
		.toLowerCase();
}

function safeDeclaration(prop: string, value: unknown): boolean {
	if (!CSS_PROP.test(prop.trim())) return false;
	const v = cssProbe(String(value));
	if (CSS_SCRIPT.test(v.replace(/\s+/g, ''))) return false;
	if (!/url\(|image-set\(/.test(v)) return true;
	const targets = [
		...[...v.matchAll(/url\(\s*(['"]?)([^'")]*)/g)].map((m) => m[2]),
		...[...v.matchAll(/(['"])(.*?)\1/g)].map((m) => m[2])
	];
	return targets.every((t) => safeUrl(t, { kind: 'resource' }) !== undefined);
}

/**
 * Drop style declarations that could load or run something unsafe: a url()
 * or image-set() target that fails `safeUrl(…, { kind: 'resource' })`,
 * `expression(`, `-moz-binding`, or a property name that is not a plain CSS
 * identifier (a key like `color:red;background` would inject a declaration).
 * Accepts the record form widgets join themselves, or a declaration string.
 */
export function safeStyle(style: string): string;
export function safeStyle(style: Record<string, unknown>): Record<string, unknown>;
export function safeStyle<T>(style: T): T;
export function safeStyle(style: unknown): unknown {
	if (typeof style === 'string') {
		return style
			.split(';')
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
