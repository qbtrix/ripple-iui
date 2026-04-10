import type { UniversalSpec } from '../schema/universal-spec.js';

/**
 * Normalizes any spec input into a UniversalSpec.
 * Lightweight — no Zod validation (that's expensive for reactive rendering).
 * Use parseUniversalSpec() separately if you need strict validation.
 */
export function normalizeSpec(input: any): UniversalSpec {
  if (!input || typeof input !== 'object') {
    return {
      version: '2.0',
      intent: 'custom',
      lifecycle: { type: 'ephemeral' },
      ui: { type: 'container', children: [] },
      selection: 'none'
    } as UniversalSpec;
  }

  // Already a UniversalSpec (has intent)
  if (input.intent) {
    return input as UniversalSpec;
  }

  // Legacy UISpec (has ui but no intent)
  if (input.ui) {
    return {
      version: '2.0',
      intent: 'custom',
      lifecycle: input.lifecycle ?? { type: 'ephemeral' },
      ui: input.ui,
      data: input.data,
      state: input.state,
      theme: input.theme,
      selection: 'none'
    } as UniversalSpec;
  }

  // Fallback
  return {
    version: '2.0',
    intent: 'custom',
    lifecycle: { type: 'ephemeral' },
    ui: { type: 'container', children: [] },
    selection: 'none'
  } as UniversalSpec;
}
