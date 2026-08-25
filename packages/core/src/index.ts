/**
 * @file index.ts
 * @description Public entry for `@ripple-ui/core` — Ripple's spec engine.
 *
 * This package is the framework-agnostic half of Ripple: the spec schema,
 * expression resolution, state, the event dispatcher, the motion compiler,
 * and the headless runtime that turns a spec into a resolved tree. It has
 * no renderer and no opinion about how a widget draws.
 *
 * Nothing here imports Svelte, React, or any other framework, and nothing
 * touches the DOM at import time. `headless/purity.test.ts` enforces that
 * over the real import graph rather than by convention.
 *
 * Renderers build on this:
 *   - `@ripple-ui/svelte` — the Svelte 5 renderer (the original package)
 *   - future renderers implement the same contract over `ResolvedNode`
 *
 * The one export that deliberately differs from the pre-split package:
 * `validateCatalog` takes its widget catalog as an argument here, because
 * the engine has no widgets of its own. `@ripple-ui/svelte` re-exports a
 * version bound to its registry, so its callers see no change.
 *
 * @changes
 *   - 2026-08-25: created (monorepo split, wave 2).
 */

// ---------------------------------------------------------------- schema
export * from './schema/index.js';

// ------------------------------------------------------------------ state
// The rune-based `StateManager` is NOT here: `$state` needs the Svelte
// compiler, so it ships from `@ripple-ui/svelte` instead. Both satisfy
// `StateStore`, and everything in this package depends on that interface
// rather than on either class.
export type { StateStore, StateSubscriber } from './core/state-store.js';
export {
	HeadlessStateManager,
	createHeadlessStateManager
} from './headless/state.js';

// ------------------------------------------------------------- dispatcher
export {
	EventDispatcher,
	createEventDispatcher,
	FlowAbortError,
	MAX_FLOW_DEPTH,
	CONFIRM_STATE_KEY,
	FLOW_ERROR_STATE_KEY,
	type OnEventCallback,
	type PendingConfirm,
	type MotionPlayer
} from './core/event-dispatcher.js';

// ------------------------------------------------------------ expressions
export {
	evaluateExpression,
	resolveString,
	resolveObject,
	resolveValue,
	evaluateCondition,
	hasExpressions,
	withFlowContext,
	type ResolverContext
} from './core/expression-resolver.js';

// ------------------------------------------------------------------- spec
export { normalizeSpec } from './core/normalizer.js';
export { newNodeId, isValidNodeId, ensureNodeIds } from './core/spec-id.js';
export {
	findById,
	findParent,
	getNodeProp,
	applyAddNode,
	applyReplaceNode,
	applySetNodeProp,
	applyMoveNode,
	applyRemoveNode,
	applySetPropArrayItem,
	applyAppendPropArrayItem,
	applyRemovePropArrayItem,
	applyOp,
	type AddNodeOp,
	type ReplaceNodeOp,
	type SetNodePropOp,
	type MoveNodeOp,
	type RemoveNodeOp,
	type SetPropArrayItemOp,
	type AppendPropArrayItemOp,
	type RemovePropArrayItemOp
} from './core/spec-mutator.js';
export {
	getStatePath,
	setStatePath,
	appendStatePath,
	removeStatePath,
	patchState,
	applyStateOp
} from './core/state-mutator.js';

/**
 * Catalog gate. Unlike the pre-split export, this takes `widgetTypes` —
 * the engine ships no widgets, so it cannot know what is renderable until
 * a renderer tells it. `@ripple-ui/svelte` binds its own registry.
 */
export {
	validateCatalog,
	type UnknownNode,
	type ValidateCatalogOptions
} from './core/validate-catalog.js';

// --------------------------------------------------------------- registry
export {
	WidgetRegistry,
	createWidgetRegistry,
	type WidgetMethod
} from './core/widget-registry.js';
export {
	getBindContract,
	DEFAULT_BIND_CONTRACT,
	warnUnregisteredBindContract,
	_resetBindContractWarnings,
	type WidgetBindContract
} from './core/widget-bind-contract.js';

// ----------------------------------------------------------------- theme
export { themeToCssVars, themeToStyleString } from './core/theme-applier.js';
export {
	brandToCssVars,
	brandToStyleString,
	type BrandApplyOptions
} from './core/brand-applier.js';

// ------------------------------------------------------------------ flows
export { isFlowSpec, unwrapFlowRoot } from './core/flow-spec.js';

// ----------------------------------------------------------------- motion
export { compileMotion, stateToStyle } from './motion/engine.js';
export {
	resolvePreset,
	resolveEasing,
	springToCssTiming,
	ffTokenToCssTiming,
	FF_SPRING_TOKENS,
	EASING_CUBIC_BEZIER,
	type ResolvedPhysics
} from './motion/presets.js';
export { rewriteForReducedMotion } from './motion/reduce-motion.js';
// Lazy loaders for the Tier-1 animation engine. They `import('motion')` on
// call, never at module scope, so importing this package still pulls in no
// animation engine and stays safe on a server pass.
export { loadAnimate, loadInView } from './motion/load-tier1.js';

// -------------------------------------------------------------- host types
export type { RippleEvent, RippleEventResult } from './types.js';

// --------------------------------------------------------------- headless
// Also available as `@ripple-ui/core/headless` for consumers that want the
// runtime without pulling the rest of the engine's surface into scope.
export {
	RippleHeadless,
	createHeadlessRuntime,
	resolveTree,
	type HeadlessRuntimeOptions,
	type ResolvedNode,
	type ResolvedTree,
	type ResolveContext
} from './headless/index.js';
