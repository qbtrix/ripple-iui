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
  type ResolverContext
} from './core/expression-resolver.js';
export { normalizeSpec } from './core/normalizer.js';
export { newNodeId, isValidNodeId, ensureNodeIds } from './core/spec-id.js';
export {
  findById,
  findParent,
  applyAddNode,
  applyReplaceNode,
  applySetNodeProp,
  applyMoveNode,
  applyRemoveNode,
  applyOp,
  type AddNodeOp,
  type ReplaceNodeOp,
  type SetNodePropOp,
  type MoveNodeOp,
  type RemoveNodeOp
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
export { UniversalSpec, IntentType, LifecycleType, parseUniversalSpec, safeParseUniversalSpec } from './schema/universal-spec.js';
export { EventHandler, EventAction, EventHandlerOrArray } from './schema/event-handler.js';
export { WidgetType, WIDGET_CATEGORIES } from './schema/widget-types.js';

// Actions
export { reorderable, type ReorderableOptions } from './actions/reorderable.js';

// Types
export type { RippleEvent, RippleEventResult } from './types.js';
export type { OnEventCallback } from './core/event-dispatcher.js';
