/**
 * @file manifest/illustration-svg.ts
 * @description The allowlist contract for the `illustration` widget
 * (model-written animated SVG), as plain data. Copied from design doc
 * 2026-10-09-ripple-illustration-svg.md; the pocketpaw card validator and the
 * landing card policy mirror these exact lists, so do not add or remove
 * entries here without changing the doc and both mirrors.
 *
 * The DOM-side check and rebuild live in `@ripple-ui/svelte`
 * (`checkIllustrationSvg`, `sanitizeIllustrationSvg`). This module stays
 * framework-free and DOM-free.
 */

const set = (words: string) => new Set(words.trim().split(/\s+/)) as ReadonlySet<string>;

/** Elements the widget keeps. Everything else is dropped with its subtree. */
export const ILLUSTRATION_ELEMENTS = set(`svg g defs title desc path rect circle ellipse line polyline
polygon text tspan linearGradient radialGradient stop clipPath mask symbol use
animate animateTransform animateMotion mpath set`);

/** Attributes allowed on any allowed element. */
export const ILLUSTRATION_ATTRIBUTES = set(`id viewBox width height x y x1 y1 x2 y2
cx cy r rx ry fx fy d points pathLength fill fill-opacity fill-rule stroke
stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit
stroke-dasharray stroke-dashoffset opacity transform clip-path clip-rule mask
gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity
clipPathUnits maskUnits maskContentUnits preserveAspectRatio font-size
font-weight font-family font-style text-anchor dominant-baseline letter-spacing
visibility display`);

/** The animation elements; also the elements the caps count. */
export const ILLUSTRATION_ANIMATION_ELEMENTS = set(`animate animateTransform animateMotion set`);

/** Attributes allowed only on the animation elements. */
export const ILLUSTRATION_ANIMATION_ATTRIBUTES = set(`attributeName from to by values dur begin end repeatCount repeatDur fill
calcMode keyTimes keySplines keyPoints additive accumulate type path rotate
restart`);

/** The closed list of `attributeName` values an animation may target. */
export const ILLUSTRATION_ANIMATABLE = set(`fill fill-opacity stroke stroke-width
stroke-opacity stroke-dasharray stroke-dashoffset opacity transform d points
x y x1 y1 x2 y2 cx cy r rx ry width height offset stop-color stop-opacity
visibility display font-size letter-spacing`);

/** Elements that may carry `href` / `xlink:href`, and only as `#<id>`. */
export const ILLUSTRATION_HREF_ELEMENTS = set(`use mpath`);

/** `animateTransform` `type` values. */
export const ILLUSTRATION_TRANSFORM_TYPES = set(`translate scale rotate skewX skewY`);

/** Hostile elements: the policy layers refuse the card, the widget drops them. */
export const ILLUSTRATION_HOSTILE_ELEMENTS = set(`script style foreignObject iframe object embed a image feImage
audio video canvas`);

/** Value tokens no attribute value may contain (case-insensitive, after
 *  stripping whitespace and control characters). */
export const ILLUSTRATION_DANGER_TOKENS = ['javascript:', 'data:', 'vbscript:', 'expression('] as const;

/** Named entities allowed besides numeric character references. */
export const ILLUSTRATION_ENTITIES = set(`lt gt amp quot apos`);

export const ILLUSTRATION_CAPS = {
	/** Markup length in characters. */
	maxChars: 24_000,
	/** Elements in the parsed document, every namespace, before any dropping. */
	maxElements: 400,
	/** Nesting depth; the root `<svg>` is depth 1. */
	maxDepth: 24,
	/** `animate animateTransform animateMotion set` elements. */
	maxAnimations: 40,
	/** Minimum `dur` in seconds on every animation that sets one (flash guard). */
	minDurSeconds: 0.5,
	/** Largest numeric `repeatCount`; `indefinite` is also allowed. */
	maxRepeatCount: 1000,
	/** `use` elements. A `use` may also never point at a `use` or at a subtree
	 *  holding one (no nested use, no self-reference), so fan-out stays bounded. */
	maxUse: 40,
	/** Largest magnitude of any number in a kept attribute value (`id`,
	 *  `font-family`, `begin`, `end` and `#hex` / `#id` tokens are not scanned). */
	maxNumber: 1_000_000,
	/** Entries (`;`-separated, non-empty) in a `values`, `keyTimes` or `keySplines` list. */
	maxListEntries: 200,
	/** Characters in a `d` (or animateMotion `path`) value. */
	maxPathChars: 8_000
} as const;

/** `max_height` prop bounds, in px. */
export const ILLUSTRATION_MAX_HEIGHT = { min: 80, max: 640, default: 320 } as const;
