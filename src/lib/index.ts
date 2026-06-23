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
} from './core/event-dispatcher.js';
export { WidgetRegistry, createWidgetRegistry, type WidgetMethod } from './core/widget-registry.js';
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
export { normalizeSpec } from './core/normalizer.js';
export { themeToCssVars, themeToStyleString } from './core/theme-applier.js';
export {
  validateCatalog,
  type UnknownNode,
  type ValidateCatalogOptions
} from './core/validate-catalog.js';
export { newNodeId, isValidNodeId, ensureNodeIds } from './core/spec-id.js';
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
} from './core/spec-mutator.js';
export {
  getStatePath,
  setStatePath,
  appendStatePath,
  removeStatePath,
  patchState,
  applyStateOp
} from './core/state-mutator.js';

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
export { UISpec, UINode, DataFetcher, ThemeOverrides, parseUISpec, safeParseUISpec } from './schema/ui-spec.js';
export { UniversalSpec, IntentType, LifecycleType, FlowAction, parseUniversalSpec, safeParseUniversalSpec } from './schema/universal-spec.js';
export { EventHandler, EventAction, EventHandlerOrArray } from './schema/event-handler.js';

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
export { WidgetType, WIDGET_CATEGORIES } from './schema/widget-types.js';

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
export { FF_SPRING_TOKENS } from './motion/presets.js';

// Fluid Functionalism systems layer (MIT)
export {
  wghtStyle, animateWght,
  proximity, proximityHover,
  nextElevation, surfaceVar, currentElevation, provideElevation, ELEVATION_MAX,
} from './systems/index.js';

// Types
export type { RippleEvent, RippleEventResult } from './types.js';
export type { OnEventCallback } from './core/event-dispatcher.js';
