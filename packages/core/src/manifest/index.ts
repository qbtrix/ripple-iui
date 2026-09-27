/**
 * @file manifest/index.ts
 * @description Public entry for `@ripple-ui/core/manifest`: the LLM-facing
 * documents that describe the engine rather than any widget. The action
 * grammar and the spec envelope (shared with `@ripple-ui/svelte`'s full
 * manifest), and the slim manifest for `@ripple-ui/core/headless/slim`.
 *
 * Pure data and small builders: no zod, no Svelte, no DOM.
 *
 * @changes
 *   - 2026-09-27: created.
 *   - 2026-09-27: exports SLIM_WIDGETS, the standard atoms for slim hosts.
 */

export { manifestActions, type ActionSpec } from './actions.js';
export { specEnvelope, type SpecEnvelope } from './envelope.js';
export {
	buildSlimManifest,
	slimActions,
	type SlimManifest,
	type SlimManifestOptions,
	type SlimWidgetEntry,
	type SlimWidgetField
} from './slim.js';
export { BASE_ACTIONS, type BaseAction } from '../core/base-dispatcher.js';
export { SLIM_WIDGETS } from './slim-widgets.js';
