// Main component
export { default as Ripple } from './Ripple.svelte';

// Core engine
export { StateManager, createStateManager } from './core/state-manager.svelte.js';
export { EventDispatcher, createEventDispatcher } from './core/event-dispatcher.js';
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

// Types
export type { RippleEvent } from './types.js';
export type { OnEventCallback } from './core/event-dispatcher.js';
