/**
 * @file ui-spec.ts
 * @description Main UISpec schema - the complete specification for a JSON UI.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with UINode, DataFetcher, and UISpec schemas
 *   - Recursive UINode definition for nested component trees
 *   - Added optional `sources` key — server-executed read bindings (RFC 04),
 *     preserved verbatim by ripple as opaque pass-through
 *   - Added node-level `motion` field (RFC 12 animation primitive).
 *   - Added font + logo tokens to ThemeOverrides (RFC 12 white-label theme-applier).
 *   - Spec versioning: `version` was `z.literal('1.0')`, so ANY future spec
 *     (`1.1`, …) failed to parse outright. It now accepts any `<major>.<minor>`
 *     inside the renderer's major line (additive minors render fine) and
 *     rejects a different major with a clear message. See CURRENT_SPEC_VERSION.
 *   - Removed the `DataFetcher` schema and `UISpec.data`. Nothing ever ran them:
 *     `Ripple.svelte` seeds the `ui-data` context with an empty store and never
 *     populates it from `spec.data`, so a declared fetcher silently resolved to
 *     nothing. `sources` (RFC 04, server-executed) is the live remote-data path.
 *     The resolver's `data` expression scope is untouched — that is a real
 *     capability a host populates directly.
 *   - Review pass: the version regex tolerates a semver patch digit ("1.0.0"
 *     parses — LLMs emit it constantly and hard-failing the whole spec over it
 *     defeats the forgiving intent), and the compat helper is scoped by name to
 *     Gen-1 (isCompatibleUISpecVersion) so hosts don't point it at Gen-2
 *     UniversalSpec versions it knows nothing about.
 */

import { z } from 'zod';
import { EventHandlerOrArray } from './event-handler.js';
import { Motion } from './motion.js';

/**
 * The spec version this renderer speaks. Bump the MINOR for additive changes
 * (older renderers keep rendering them); bump the MAJOR only for a breaking
 * shape change.
 */
export const CURRENT_SPEC_VERSION = '1.0';

const CURRENT_SPEC_MAJOR = Number(CURRENT_SPEC_VERSION.split('.')[0]);
// Accepts an optional semver-style patch digit ("1.0.0"): it carries no
// meaning in the spec contract, but LLMs emit it out of habit and refusing
// the whole spec over it would defeat the forgiving intent.
const SPEC_VERSION_RE = /^(\d+)\.(\d+)(?:\.\d+)?$/;

/**
 * Can this build render a **Gen-1 `UISpec`** declaring `version`?
 *
 * Same major → yes. A newer MINOR is additive by contract, so we render it and
 * ignore the fields we don't know (zod strips unknown keys). A different MAJOR
 * is a breaking shape change → refuse rather than mis-render it.
 *
 * Gen-1 ONLY: `UniversalSpec` (Gen-2, `version: '2.0'`) is versioned
 * separately — do not use this as a generic pre-mount check for both spec
 * generations, it will refuse Gen-2 specs this renderer renders fine.
 */
export function isCompatibleUISpecVersion(version: string): boolean {
	const match = SPEC_VERSION_RE.exec(version);
	if (!match) return false;
	return Number(match[1]) === CURRENT_SPEC_MAJOR;
}

/**
 * @deprecated Renamed to {@link isCompatibleUISpecVersion} — the old name read
 * as covering every spec generation, but it only ever spoke Gen-1 `UISpec`.
 */
export const isCompatibleSpecVersion = isCompatibleUISpecVersion;

/**
 * Base UI Node schema (before adding recursive children).
 * Represents a single widget in the UI tree.
 */
const UINodeBase = z.object({
	/** Widget type - determines which component renders (accepts any string for cross-project compat) */
	type: z.string(),

	/** Unique identifier for this node */
	id: z.string().optional(),

	/** Widget-specific properties */
	props: z.record(z.string(), z.any()).optional(),

	/** Reactive binding to state - uses {state.path} syntax */
	bind: z.string().optional(),

	/** Conditional visibility - expression that evaluates to boolean */
	show: z.string().optional(),

	/** CSS class names */
	class: z.string().optional(),

	/** Inline styles */
	style: z.record(z.string(), z.string()).optional(),

	/** Declarative animation — node-level, sibling to class/style. See schema/motion.ts. */
	motion: Motion.optional(),

	/** Named snippet slot to route this child into on its parent widget
	 *  (e.g., 'header' or 'footer' on a Card). Ignored for parents without that slot. */
	slot: z.string().optional(),

	// Event handlers
	on_click: EventHandlerOrArray.optional(),
	on_change: EventHandlerOrArray.optional(),
	on_input: EventHandlerOrArray.optional(),
	on_submit: EventHandlerOrArray.optional(),
	on_focus: EventHandlerOrArray.optional(),
	on_blur: EventHandlerOrArray.optional(),

	// Control flow: 'each' widget
	/** Data source for iteration (state path or data key) */
	items: z.string().optional(),
	/** Variable name for current item in loop */
	item_as: z.string().optional(),
	/** Variable name for current index */
	index_as: z.string().optional(),

	// Control flow: 'if' widget
	/** Condition expression for if/else */
	condition: z.string().optional()
});

/**
 * Recursive UINode type.
 * Uses z.lazy() for self-referencing children and else_children.
 */
export type UINode = z.infer<typeof UINodeBase> & {
	children?: UINode[];
	else_children?: UINode[];
};

export const UINode: z.ZodType<UINode> = UINodeBase.extend({
	/** Child nodes */
	children: z.lazy(() => z.array(UINode)).optional(),
	/** Alternative children for 'if' widget when condition is false */
	else_children: z.lazy(() => z.array(UINode)).optional()
});

/**
 * Theme overrides for customizing appearance.
 */
export const ThemeOverrides = z.object({
	/** Semantic color overrides (Hex or OKLCH) */
	colors: z.object({
		background: z.string().optional(),
		foreground: z.string().optional(),
		card: z.string().optional(),
		'card-foreground': z.string().optional(),
		popover: z.string().optional(),
		'popover-foreground': z.string().optional(),
		primary: z.string().optional(),
		'primary-foreground': z.string().optional(),
		secondary: z.string().optional(),
		'secondary-foreground': z.string().optional(),
		muted: z.string().optional(),
		'muted-foreground': z.string().optional(),
		accent: z.string().optional(),
		'accent-foreground': z.string().optional(),
		destructive: z.string().optional(),
		'destructive-foreground': z.string().optional(),
		border: z.string().optional(),
		input: z.string().optional(),
		ring: z.string().optional(),
		'chart-1': z.string().optional(),
		'chart-2': z.string().optional(),
		'chart-3': z.string().optional(),
		'chart-4': z.string().optional(),
		'chart-5': z.string().optional(),
		sidebar: z.string().optional(),
		'sidebar-foreground': z.string().optional(),
		'sidebar-primary': z.string().optional(),
		'sidebar-primary-foreground': z.string().optional(),
		'sidebar-accent': z.string().optional(),
		'sidebar-accent-foreground': z.string().optional(),
		'sidebar-border': z.string().optional(),
		'sidebar-ring': z.string().optional()
	}).optional(),
	/** Border radius (e.g., "0.5rem") */
	radius: z.string().optional(),
	/** Dark mode preference */
	mode: z.enum(['light', 'dark', 'system']).optional(),
	/** Font-family tokens — emitted as CSS vars (--ripple-font-*). */
	fonts: z.object({
		sans: z.string().optional(),
		serif: z.string().optional(),
		mono: z.string().optional(),
		heading: z.string().optional()
	}).optional(),
	/** Brand logo — surfaced to widgets (e.g. Navbar) and emitted as --ripple-logo*. */
	logo: z.object({
		src: z.string(),
		alt: z.string().optional(),
		darkSrc: z.string().optional()
	}).optional()
});

export type ThemeOverrides = z.infer<typeof ThemeOverrides>;

/**
 * Complete UI Specification.
 * This is the root schema that LLMs generate.
 */
export const UISpec = z.object({
	/**
	 * Schema version. Any `<major>.<minor>` inside this renderer's major line is
	 * accepted — a newer minor is additive, so it renders and unknown keys are
	 * stripped. A different major is refused (see {@link isCompatibleSpecVersion}).
	 */
	version: z
		.string()
		.refine(isCompatibleSpecVersion, {
			message: `Unsupported spec version — this renderer speaks ${CURRENT_SPEC_MAJOR}.x`
		})
		.default(CURRENT_SPEC_VERSION),

	/** Initial state values */
	state: z.record(z.string(), z.any()).optional(),

	/**
	 * Server-executed read bindings ("sources"), keyed by name (RFC 04).
	 * The server owns and runs sources; ripple never executes them — it only
	 * preserves this key verbatim so a client round-trip cannot drop it.
	 */
	sources: z.record(z.string(), z.any()).optional(),

	/** The UI tree (required) */
	ui: UINode,

	/** Theme customizations */
	theme: ThemeOverrides.optional(),

	/** Metadata about the UI */
	meta: z
		.object({
			title: z.string().optional(),
			description: z.string().optional()
		})
		.optional()
});

export type UISpec = z.infer<typeof UISpec>;

/**
 * Validate a UISpec object.
 * Returns parsed result or throws ZodError.
 */
export function parseUISpec(input: unknown): UISpec {
	return UISpec.parse(input);
}

/**
 * Safely validate a UISpec object.
 * Returns { success, data, error } instead of throwing.
 */
export function safeParseUISpec(input: unknown) {
	return UISpec.safeParse(input);
}
