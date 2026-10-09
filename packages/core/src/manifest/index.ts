/**
 * @file manifest/index.ts
 * @description Public entry for `@ripple-ui/core/manifest`: the LLM-facing
 * documents that describe the engine rather than any widget. The action
 * grammar and the spec envelope (shared with `@ripple-ui/svelte`'s full
 * manifest), and the slim manifest for `@ripple-ui/core/headless/slim`.
 *
 * Also the `illustration` widget's SVG allowlist (illustration-svg.ts), which
 * the pocketpaw validator and the landing card policy mirror.
 *
 * Pure data and small builders: no zod, no Svelte, no DOM.
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
export {
	ILLUSTRATION_ELEMENTS,
	ILLUSTRATION_ATTRIBUTES,
	ILLUSTRATION_ANIMATION_ELEMENTS,
	ILLUSTRATION_ANIMATION_ATTRIBUTES,
	ILLUSTRATION_ANIMATABLE,
	ILLUSTRATION_HREF_ELEMENTS,
	ILLUSTRATION_TRANSFORM_TYPES,
	ILLUSTRATION_HOSTILE_ELEMENTS,
	ILLUSTRATION_DANGER_TOKENS,
	ILLUSTRATION_ENTITIES,
	ILLUSTRATION_CAPS,
	ILLUSTRATION_MAX_HEIGHT,
	ILLUSTRATION_ANNOTATION_CAPS
} from './illustration-svg.js';
