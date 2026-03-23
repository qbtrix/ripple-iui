/**
 * @file universal-spec.ts
 * @description Universal Spec schema (Gen 2) - The unified specification for all UI intents.
 * Supports Intents, Lifecycles, and Composability.
 */

import { z } from 'zod';
import { UINode, ThemeOverrides, DataFetcher } from './ui-spec.js';

// =============================================================================
// Enums & Constants
// =============================================================================

export const IntentType = z.enum([
  'browse',   // Grid/List of items
  'select',   // Pick one or more items
  'detail',   // View single item details
  'form',     // Input data
  'confirm',  // Review and submit
  'info',     // Read-only information
  'search',   // Search interface
  'action',   // Trigger an action
  'custom',   // Raw UI control (Escape hatch)
  'workspace',// Tool-based workspace
  'dashboard' // Persistent dashboard
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
  layout: z.enum(['auto', 'grid', 'list', 'masonry', 'carousel', 'hero', 'split']).default('auto'),
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
export const UniversalSpec = z.object({
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

  // Chaining (Pre-loaded next step)
  chain: z.lazy(() => UniversalSpec).optional()
});

export type UniversalSpec = z.infer<typeof UniversalSpec>;

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
