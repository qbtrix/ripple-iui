/**
 * @file universal-spec.ts
 * @description Universal Spec schema (Gen 2) - The unified specification for all UI intents.
 * Supports Intents, Lifecycles, and Composability.
 * @changes
 *   - Added optional `sources` key — server-executed read bindings (RFC 04),
 *     preserved verbatim by ripple as opaque pass-through
 *   - RFC 13 M1: typed the Chain Flow primitive fields — `chain_map` (branch on
 *     selection id), `flowId` (stable step id that namespaces accumulated data),
 *     and `onComplete` (`FlowAction` run at a terminal step). `chain` was already
 *     present; `chain_map` was previously read off the spec via `as any`.
 *   - 2026-06-07: extend DisplayHints.layout ADDITIVELY with the composite +
 *     ported intent-layout hints (comparison, checklist, invoice, report,
 *     timeline, table, article). IntentType is unchanged — these are display
 *     hints, not intents, so the layout engine can route an `info`/`browse`/
 *     `custom` spec to a designed composite layout WITHOUT inventing IntentType
 *     enum values. Existing hints are untouched, so prior specs are unaffected.
 *   - 2026-06-08: reconcile IntentType with the intents the renderer actually
 *     routes on. ADDED `quick_confirm` (layout-engine summary-card + IntentRenderer
 *     SummaryLayout + Ripple DESIGNED_INTENTS), `widget` (layout-engine `widget`
 *     layout, tested), and `itinerary` (layout-engine `itinerary` layout, tested).
 *     Without these the enum rejected/coerced schema-valid specs, making those
 *     routing paths unreachable. No existing values removed.
 */

import { z } from 'zod';
import { UINode, ThemeOverrides, DataFetcher } from './ui-spec.js';

// =============================================================================
// Chain Flow — terminal action (RFC 13 §5.1)
// =============================================================================

/**
 * FlowAction — the action a Chain Flow runs when it reaches a terminal step
 * (no `chain` / `chain_map` left). Distinct from the action-VM's `flow` verb
 * (`event-dispatcher.ts`), which sequences actions *within* one step; this is
 * the terminal hand-off of a step *sequence*. See ChainExecutor for the split.
 */
export const FlowAction = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('emit'),
    event: z.string(),
    payload: z.any().optional()
  }),
  z.object({
    kind: z.literal('navigate'),
    url: z.string()
  }),
  z.object({
    kind: z.literal('chat'),
    message: z.string()
  })
]);

export type FlowAction = z.infer<typeof FlowAction>;

// =============================================================================
// Enums & Constants
// =============================================================================

export const IntentType = z.enum([
  'browse',       // Grid/List of items
  'select',       // Pick one or more items
  'detail',       // View single item details
  'form',         // Input data
  'confirm',      // Review and submit
  'quick_confirm',// Lightweight review/submit step (routes to summary-card)
  'info',         // Read-only information
  'search',       // Search interface
  'action',       // Trigger an action
  'custom',       // Raw UI control (Escape hatch)
  'workspace',    // Tool-based workspace
  'dashboard',    // Persistent dashboard
  'widget',       // Single-widget display (routes to widget layout)
  'itinerary'     // Multi-day travel plan with timeline (routes to itinerary layout)
]);

export type IntentType = z.infer<typeof IntentType>;

export const LifecycleType = z.enum([
  'ephemeral', // Inline, disappears after completion (Default)
  'tool',      // Modal/Panel, stays open until dismissed
  'persistent' // Pinned to sidebar/dashboard
]);

export type LifecycleType = z.infer<typeof LifecycleType>;

// =============================================================================
// Component Specs
// =============================================================================

/**
 * Configuration for the 'lifecycle' behavior.
 */
export const LifecycleConfig = z.object({
  type: LifecycleType.default('ephemeral'),
  id: z.string().optional(), // Required for persistent/tool to track state
  icon: z.string().optional(), // Icon for sidebar/tool-panel
  label: z.string().optional() // Label for sidebar/tool-panel
});

export type LifecycleConfig = z.infer<typeof LifecycleConfig>;

/**
 * Field mapping for intents that need to understand data structure.
 * e.g., "Which field is the title? Which is the image?"
 */
export const FieldMapping = z.record(z.string(), z.string()); // key: semantic_name, value: data_path

/**
 * Display hints for the auto-layout engine.
 */
export const DisplayHints = z.object({
  layout: z
    .enum([
      'auto',
      'grid',
      'list',
      'masonry',
      'carousel',
      'hero',
      'split',
      // Composite / ported designed-layout hints (2026-06-07). Route an
      // otherwise-generic intent to a designed layout via display.layout.
      'comparison',
      'checklist',
      'invoice',
      'report',
      'timeline',
      'table',
      'article'
    ])
    .default('auto'),
  columns: z.number().optional(),
  density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
  item_template: UINode.optional() // Custom template for items in a list/grid
});

// =============================================================================
// Universal Spec
// =============================================================================

/**
 * The Universal Spec - One type to rule them all.
 */
export const UniversalSpec: z.ZodType<UniversalSpecType> = z.object({
  // Core Identity
  id: z.string().optional(),
  version: z.literal('2.0').default('2.0'),

  // High-Level Behavior
  intent: IntentType,
  lifecycle: LifecycleConfig.optional().default({ type: 'ephemeral' }),

  // Content
  title: z.string().optional(),
  description: z.string().optional(),
  theme: ThemeOverrides.optional(),

  // Data
  data: z.union([
    z.record(z.string(), z.any()), // Inline data
    DataFetcher // Remote data
  ]).optional(),

  // Server-executed read bindings ("sources"), keyed by name (RFC 04).
  // The server owns and runs sources; ripple never executes them — it only
  // preserves this key verbatim so a client round-trip cannot drop it.
  sources: z.record(z.string(), z.any()).optional(),

  fields: FieldMapping.optional(),

  // Layout Control
  display: DisplayHints.optional(),

  // Escape Hatch / Direct Control
  ui: UINode.optional(), // Used when intent='custom' OR to override auto-layout

  // Interactions (High Level)
  selection: z.enum(['single', 'multiple', 'none']).default('none'),

  // Action Chains (What happens next?)
  // We'll use a simplified action definition for now, can expand later
  on_select: z.any().optional(),
  on_complete: z.any().optional(),

  // --- Chain Flow primitive (RFC 13 §5.1) ---------------------------------
  // The whole multi-step decision tree is materialized up front as one nested
  // spec, so the ChainExecutor walks it client-side with zero round-trips.
  // `chain` is the linear next step; `chain_map` branches on the selected
  // item's id. `flowId` namespaces this step's accumulated data; `onComplete`
  // runs when no chain/chain_map remains.

  /** Stable step id; namespaces accumulated data (`<flowId>_selection`/`_formData`). */
  flowId: z.string().optional(),

  /** Linear next step (Pre-loaded). */
  chain: z.lazy(() => UniversalSpec).optional(),

  /** Branch: selected item's id -> next step. Resolved before `chain`. */
  chain_map: z.lazy(() => z.record(z.string(), UniversalSpec)).optional(),

  /** Terminal action fired when `advance` reaches a step with no chain/chain_map. */
  onComplete: FlowAction.optional()
});

// Type defined before the schema to break circular inference
type UniversalSpecType = {
  id?: string;
  version: '2.0';
  intent: z.infer<typeof IntentType>;
  lifecycle?: z.infer<typeof LifecycleConfig>;
  title?: string;
  description?: string;
  theme?: z.infer<typeof ThemeOverrides>;
  data?: Record<string, any> | z.infer<typeof DataFetcher>;
  sources?: Record<string, any>;
  fields?: Record<string, string>;
  display?: z.infer<typeof DisplayHints>;
  ui?: z.infer<typeof UINode>;
  selection?: 'single' | 'multiple' | 'none';
  on_select?: any;
  on_complete?: any;
  // Chain Flow primitive (RFC 13)
  flowId?: string;
  chain?: UniversalSpecType;
  chain_map?: Record<string, UniversalSpecType>;
  onComplete?: FlowAction;
};

export type UniversalSpec = UniversalSpecType;

/**
 * Helper to parse a Universal Spec
 */
export function parseUniversalSpec(input: unknown): UniversalSpec {
  return UniversalSpec.parse(input);
}

/**
 * Helper to safely parse a Universal Spec
 */
export function safeParseUniversalSpec(input: unknown) {
  return UniversalSpec.safeParse(input);
}

/**
 * Normalizes any spec (Legacy or Universal) into a UniversalSpec.
 * This ensures backward compatibility with "Gen 1" specs.
 */
export function normalizeSpec(input: any): UniversalSpec {
  // 1. If it's already a valid Universal Spec, return it
  const parseResult = safeParseUniversalSpec(input);
  if (parseResult.success) {
    return parseResult.data;
  }

  // 2. If it's a legacy UISpec (Gen 1), wrap it in a 'custom' intent
  // Legacy specs usually have a root 'ui' property but no 'intent'
  if (input && typeof input === 'object' && input.ui && !input.intent) {
    return {
      version: '2.0',
      intent: 'custom', // Legacy specs are treated as custom/raw UI
      lifecycle: { type: 'ephemeral' },
      ui: input.ui,
      data: input.data,
      theme: input.theme,
      state: input.state // Preserve initial state if present
    } as UniversalSpec;
  }

  // 3. Fallback for unknown/invalid input
  console.warn('Invalid Spec detected, falling back to empty custom intent:', input);
  return {
    version: '2.0',
    intent: 'custom',
    lifecycle: { type: 'ephemeral' },
    ui: { type: 'container', children: [] } // Empty container
  };
}
