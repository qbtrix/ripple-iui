// universal-spec.intent.test.ts — verifies IntentType is reconciled with the
// intents the renderer actually routes on.
// Created 2026-06-08 (FIX #1): a spec carrying intent 'quick_confirm', 'widget',
// or 'itinerary' must parse as valid (no longer coerced/rejected) and reach its
// designed layout via the layout engine.
import { describe, it, expect } from 'vitest';
import { IntentType, safeParseUniversalSpec } from '../universal-spec.js';
import { determineLayout } from '../../intent/layout-engine.js';

describe('IntentType enum reconciliation (FIX #1)', () => {
  it.each(['quick_confirm', 'widget', 'itinerary'])(
    'accepts the routed intent %s in the enum',
    (intent) => {
      expect(IntentType.safeParse(intent).success).toBe(true);
    }
  );

  it('parses a quick_confirm spec as valid', () => {
    const result = safeParseUniversalSpec({
      version: '2.0',
      intent: 'quick_confirm',
      title: 'Confirm your choice',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.intent).toBe('quick_confirm');
  });

  it('parses a widget spec as valid', () => {
    const result = safeParseUniversalSpec({
      version: '2.0',
      intent: 'widget',
      title: 'Single widget',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.intent).toBe('widget');
  });

  it('keeps all pre-existing intents', () => {
    for (const intent of [
      'browse',
      'select',
      'detail',
      'form',
      'confirm',
      'info',
      'search',
      'action',
      'custom',
      'workspace',
      'dashboard',
    ]) {
      expect(IntentType.safeParse(intent).success).toBe(true);
    }
  });

  // A schema-valid quick_confirm/widget spec must reach its designed layout,
  // proving the routing path is no longer dead.
  it('routes a quick_confirm spec to summary-card', () => {
    const spec = safeParseUniversalSpec({ version: '2.0', intent: 'quick_confirm' });
    expect(spec.success).toBe(true);
    if (spec.success) expect(determineLayout(spec.data as never)).toBe('summary-card');
  });

  it('routes a widget spec to the widget layout', () => {
    const spec = safeParseUniversalSpec({ version: '2.0', intent: 'widget' });
    expect(spec.success).toBe(true);
    if (spec.success) expect(determineLayout(spec.data as never)).toBe('widget');
  });
});
