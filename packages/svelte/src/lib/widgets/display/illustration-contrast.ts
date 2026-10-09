// widgets/display/illustration-contrast.ts: colour maths for keeping the
// illustration widget's text readable: parse a CSS colour, WCAG relative
// luminance and contrast, alpha compositing, and the pick between two
// candidate ink colours. Pure, no DOM; the DOM pass lives in
// Illustration.svelte.
//
// parseColor covers what models write in SVG (#rgb, #rgba, #rrggbb,
// #rrggbbaa, rgb()/rgba(), a small named map) and what getComputedStyle hands
// back for Ripple's tokens (rgb(), oklch(), oklab(), color(srgb ...)).
// Anything else, `url(#..)` and `none` included, is null so the caller leaves
// it alone. Channels are 0..1 gamma-encoded sRGB, alpha 0..1.

export type Rgba = [r: number, g: number, b: number, a: number];

const NAMED: Record<string, string> = {
	black: '#000',
	white: '#fff',
	red: '#f00',
	green: '#008000',
	lime: '#0f0',
	blue: '#00f',
	navy: '#000080',
	yellow: '#ff0',
	orange: '#ffa500',
	purple: '#800080',
	gray: '#808080',
	grey: '#808080',
	silver: '#c0c0c0',
	maroon: '#800000',
	teal: '#008080',
	olive: '#808000',
	aqua: '#0ff',
	cyan: '#0ff',
	fuchsia: '#f0f',
	magenta: '#f0f',
	pink: '#ffc0cb',
	brown: '#a52a2a',
	darkblue: '#00008b',
	darkgreen: '#006400',
	darkred: '#8b0000',
	darkgray: '#a9a9a9',
	darkgrey: '#a9a9a9',
	lightgray: '#d3d3d3',
	lightgrey: '#d3d3d3',
	gold: '#ffd700',
	indigo: '#4b0082',
	transparent: '#0000'
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** A number or percentage; `pct` is what 100% means. */
function num(s: string, pct: number): number {
	const n = parseFloat(s);
	if (!Number.isFinite(n)) return NaN;
	return s.trim().endsWith('%') ? (n / 100) * pct : n;
}

/** Split `fn(a, b, c / d)` or `fn(a b c / d)` into channel strings and alpha. */
function args(body: string): { ch: string[]; alpha: number } | null {
	const [main, slash] = body.split('/');
	const ch = main.split(/[\s,]+/).filter(Boolean);
	let alphaStr = slash?.trim();
	if (!alphaStr && ch.length === 4) alphaStr = ch.pop() ?? '';
	if (ch.length !== 3) return null;
	const alpha = alphaStr ? num(alphaStr, 1) : 1;
	return Number.isFinite(alpha) ? { ch, alpha: clamp01(alpha) } : null;
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map((v) => encode(clamp01(v))) as [number, number, number];
}

/**
 * Parse a CSS colour. `current` is what `currentColor` resolves to (null
 * leaves currentColor unparsed). Returns null for anything unknown.
 */
export function parseColor(input: string | null | undefined, current: Rgba | null = null): Rgba | null {
	if (!input) return null;
	const s = input.trim().toLowerCase();
	if (s === 'currentcolor') return current;
	if (NAMED[s]) return parseColor(NAMED[s]);
	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
	if (hex) {
		let h = hex[1];
		if (h.length <= 4) h = h.replace(/./g, '$&$&');
		const v = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
		return [v(0), v(2), v(4), h.length === 8 ? v(6) : 1];
	}
	const fn = /^([a-z]+)\((.*)\)$/.exec(s);
	if (!fn) return null;
	const [, name, body] = fn;
	if (name === 'color') {
		const m = /^srgb\s+(.*)$/.exec(body.trim());
		const p = m && args(m[1]);
		if (!p) return null;
		const c = p.ch.map((x) => num(x, 1));
		return c.every(Number.isFinite) ? [clamp01(c[0]), clamp01(c[1]), clamp01(c[2]), p.alpha] : null;
	}
	const p = args(body);
	if (!p) return null;
	if (name === 'rgb' || name === 'rgba') {
		const c = p.ch.map((x) => num(x, 255) / 255);
		return c.every(Number.isFinite) ? [clamp01(c[0]), clamp01(c[1]), clamp01(c[2]), p.alpha] : null;
	}
	if (name === 'oklab' || name === 'oklch') {
		const L = num(p.ch[0], 1);
		let a: number, b: number;
		if (name === 'oklab') {
			a = num(p.ch[1], 0.4);
			b = num(p.ch[2], 0.4);
		} else {
			const C = num(p.ch[1], 0.4);
			const H = p.ch[2] === 'none' ? 0 : (parseFloat(p.ch[2]) * Math.PI) / 180;
			a = C * Math.cos(H);
			b = C * Math.sin(H);
		}
		if (![L, a, b].every(Number.isFinite)) return null;
		return [...oklabToRgb(L, a, b), p.alpha];
	}
	return null;
}

/** `top` composited over `bottom` (the result keeps `bottom`'s alpha rule: opaque if either is). */
export function over(top: Rgba, bottom: Rgba): Rgba {
	const a = top[3] + bottom[3] * (1 - top[3]);
	if (a === 0) return [0, 0, 0, 0];
	const ch = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
	return [ch(0), ch(1), ch(2), a];
}

/** WCAG relative luminance of an opaque colour. */
export function luminance(c: Rgba): number {
	return 0.2126 * decode(c[0]) + 0.7152 * decode(c[1]) + 0.0722 * decode(c[2]);
}

/** WCAG contrast ratio of `fg` over an opaque `bg`, 1..21. A translucent fg is composited first. */
export function contrast(fg: Rgba, bg: Rgba): number {
	const f = fg[3] < 1 ? over(fg, bg) : fg;
	const [hi, lo] = [luminance(f), luminance(bg)].sort((p, q) => q - p);
	return (hi + 0.05) / (lo + 0.05);
}

/** Whichever candidate reads better on `bg`. */
export function pickReadable(bg: Rgba, a: Rgba, b: Rgba): Rgba {
	return contrast(a, bg) >= contrast(b, bg) ? a : b;
}

/** `rgb()` / `rgba()` string for an attribute. */
export function toCss([r, g, b, a]: Rgba): string {
	const c = (v: number) => Math.round(v * 255);
	return a < 1 ? `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${+a.toFixed(3)})` : `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}
