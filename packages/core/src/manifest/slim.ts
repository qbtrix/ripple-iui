/**
 * @file manifest/slim.ts
 * @description The manifest for the slim headless runtime
 * (`@ripple-ui/core/headless/slim`).
 *
 * The full manifest (`@ripple-ui/svelte`'s `buildManifest`) documents every
 * action and every built-in widget. An agent writing for a slim host needs
 * less and must see less: only the actions `BaseDispatcher` runs, because
 * anything else is skipped at runtime, and only the widgets that host
 * actually registers. So this manifest is the spec envelope, the
 * `BASE_ACTIONS` subset of the action grammar, and the widgets the host
 * passes in.
 *
 * @changes
 *   - 2026-09-27: created with the slim runtime.
 */

import { BASE_ACTIONS } from '../core/base-dispatcher.js';
import { manifestActions, type ActionSpec } from './actions.js';
import { specEnvelope, type SpecEnvelope } from './envelope.js';

/** One prop, event or node field of a widget, as the full manifest writes it. */
export interface SlimWidgetField {
	type: string;
	required: boolean;
	description: string;
}

/**
 * A widget the host registers. The same shape as a full-manifest entry, so a
 * host can reuse entries from `@ripple-ui/svelte`'s manifest where its
 * component takes the same props.
 */
export interface SlimWidgetEntry {
	type: string;
	category?: string;
	description: string;
	props: Record<string, SlimWidgetField>;
	events?: Record<string, SlimWidgetField>;
	nodeFields?: Record<string, SlimWidgetField>;
	example: { type: string; props?: Record<string, unknown>; children?: unknown; [field: string]: unknown };
}

export interface SlimManifest {
	schema: 'ripple.manifest.slim/v1';
	/** The spec envelope contract, identical to the full manifest's. */
	spec: SpecEnvelope;
	/** Grammar for exactly the actions the slim runtime runs. */
	actions: Record<string, ActionSpec>;
	/** The widgets this host can draw. */
	widgets: SlimWidgetEntry[];
}

export interface SlimManifestOptions {
	/** The widgets the host registers with its renderer. */
	widgets: SlimWidgetEntry[];
	/**
	 * Narrow the actions further (for example, a host that never navigates).
	 * Each name must be one of `BASE_ACTIONS`; anything else throws, because a
	 * manifest that promises an action the runtime skips is worse than none.
	 */
	actions?: readonly string[];
}

/** The action grammar the slim runtime runs, in `BASE_ACTIONS` order. */
export function slimActions(names: readonly string[] = BASE_ACTIONS): Record<string, ActionSpec> {
	const allowed = new Set<string>(BASE_ACTIONS);
	const out: Record<string, ActionSpec> = {};
	for (const name of names) {
		if (!allowed.has(name)) {
			throw new Error(`Ripple slim manifest: "${name}" is not run by the slim runtime.`);
		}
		const spec = manifestActions[name];
		if (!spec) throw new Error(`Ripple slim manifest: no grammar documented for "${name}".`);
		out[name] = spec;
	}
	return out;
}

/** Build the manifest an agent should see when writing for a slim host. */
export function buildSlimManifest(options: SlimManifestOptions): SlimManifest {
	const seen = new Set<string>();
	for (const widget of options.widgets) {
		if (seen.has(widget.type)) throw new Error(`Ripple slim manifest: widget "${widget.type}" is listed twice.`);
		seen.add(widget.type);
	}
	return {
		schema: 'ripple.manifest.slim/v1',
		spec: specEnvelope,
		actions: slimActions(options.actions),
		widgets: options.widgets
	};
}
