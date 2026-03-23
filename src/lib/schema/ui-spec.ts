/**
 * @file ui-spec.ts
 * @description Main UISpec schema - the complete specification for a JSON UI.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with UINode, DataFetcher, and UISpec schemas
 *   - Recursive UINode definition for nested component trees
 */

import { z } from 'zod';
import { EventHandlerOrArray } from './event-handler.js';

/**
 * Data fetcher for loading external data.
 * Can be configured to refetch on state changes or at intervals.
 */
export const DataFetcher = z.object({
	/** API endpoint URL */
	url: z.string(),

	/** HTTP method */
	method: z.enum(['GET', 'POST']).default('GET'),

	/** State paths that trigger refetch when changed */
	depends_on: z.array(z.string()).optional(),

	/** Auto-refresh interval in seconds */
	refresh_interval: z.number().optional(),

	/** Request headers */
	headers: z.record(z.string(), z.string()).optional(),

	/** Request body (for POST) */
	body: z.record(z.string(), z.any()).optional(),

	/** Transform function name to apply to response */
	transform: z.string().optional()
});

export type DataFetcher = z.infer<typeof DataFetcher>;

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

	// Event handlers
	on_click: EventHandlerOrArray.optional(),
	on_change: EventHandlerOrArray.optional(),
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
	mode: z.enum(['light', 'dark', 'system']).optional()
});

export type ThemeOverrides = z.infer<typeof ThemeOverrides>;

/**
 * Complete UI Specification.
 * This is the root schema that LLMs generate.
 */
export const UISpec = z.object({
	/** Schema version for compatibility */
	version: z.literal('1.0').default('1.0'),

	/** Initial state values */
	state: z.record(z.string(), z.any()).optional(),

	/** Data fetchers keyed by name */
	data: z.record(z.string(), DataFetcher).optional(),

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
