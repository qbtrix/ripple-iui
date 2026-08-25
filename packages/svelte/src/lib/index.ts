// Updated 2026-05-22: export validateCatalog so hosts can gate a spec
// against the widget catalog before mount (Increment 5 catalog-as-allowlist).
// Updated 2026-05-30 (Phase 2): export withMotion + the Fluid Functionalism
// systems layer (variable-font-weight, proximity-hover, elevation ladder).
// Updated 2026-05-30 (Phase 4): export themeToCssVars + themeToStyleString
// (the white-label theme-applier).

// Main component
export { default as Ripple } from './Ripple.svelte';

// Core engine
export { StateManager, createStateManager } from './core/state-manager.svelte.js';
export {
  EventDispatcher,
  createEventDispatcher,
  FlowAbortError,
  MAX_FLOW_DEPTH,
  CONFIRM_STATE_KEY,
  FLOW_ERROR_STATE_KEY,
  type PendingConfirm
} from '@ripple-ui/core';
export { WidgetRegistry, createWidgetRegistry, type WidgetMethod } from '@ripple-ui/core';
export {
  evaluateExpression,
  resolveString,
  resolveObject,
  resolveValue,
  evaluateCondition,
  hasExpressions,
  withFlowContext,
  type ResolverContext
} from '@ripple-ui/core';
export { normalizeSpec } from '@ripple-ui/core';
export { themeToCssVars, themeToStyleString } from '@ripple-ui/core';
// Bound to this renderer's widget registry — the engine's own
// `validateCatalog` takes the catalog as an argument so @ripple-ui/core
// stays free of any renderer dependency. Callers see no difference.
export {
  validateCatalog,
  type UnknownNode,
  type ValidateCatalogOptions
} from './widgets/validate-catalog-bound.js';
export { newNodeId, isValidNodeId, ensureNodeIds } from '@ripple-ui/core';
export {
  findById,
  findParent,
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
} from '@ripple-ui/core';
export {
  getStatePath,
  setStatePath,
  appendStatePath,
  removeStatePath,
  patchState,
  applyStateOp
} from '@ripple-ui/core';

// Widget registry
export {
  getWidget,
  registerWidget,
  unregisterWidget,
  hasWidget,
  getWidgetTypes,
  resetRegistry
} from './widgets/index.js';

// Schema
export {
	UISpec,
	UINode,
	ThemeOverrides,
	parseUISpec,
	safeParseUISpec,
	CURRENT_SPEC_VERSION,
	isCompatibleUISpecVersion,
	// Deprecated alias of isCompatibleUISpecVersion (Gen-1 only — see schema).
	isCompatibleSpecVersion
} from '@ripple-ui/core';
export { UniversalSpec, IntentType, LifecycleType, FlowAction, parseUniversalSpec, safeParseUniversalSpec } from '@ripple-ui/core';
export { EventHandler, EventAction, EventHandlerOrArray } from '@ripple-ui/core';

// Chain Flow primitive (RFC 13) — the client-side, zero-roundtrip multi-step
// flow runtime. `ChainExecutor` walks a nested chain/chain_map tree; `FlowRunner`
// hosts it over `<Ripple>` so a flow renders in a Pocket (or any surface).
export {
  ChainExecutor,
  MAX_HISTORY_DEPTH,
  FlowRunner,
  buildOnboardingWizard,
  type ChainState,
  type TerminalResult
} from './intent/index.js';
export { WidgetType, WIDGET_CATEGORIES } from '@ripple-ui/core';

// Actions
export { reorderable, type ReorderableOptions } from './actions/reorderable.js';
export { withMotion } from './actions/index.js';

// Motion primitives (Fluid Functionalism) — reusable by host apps for
// shared-layout sliding indicators (animated tabs/segmented nav) and FF timing.
export {
  movingIndicator,
  type MovingIndicatorOptions,
  type IndicatorRect,
  type ActiveSource,
} from './motion/moving-indicator.js';
export { FF_SPRING_TOKENS } from '@ripple-ui/core';

// Fluid Functionalism systems layer (MIT)
export {
  wghtStyle, animateWght,
  proximity, proximityHover,
  nextElevation, surfaceVar, currentElevation, provideElevation, ELEVATION_MAX,
} from './systems/index.js';

// Types
export type { RippleEvent, RippleEventResult } from '@ripple-ui/core';
export type { OnEventCallback } from '@ripple-ui/core';
