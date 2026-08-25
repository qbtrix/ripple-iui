// @file manifest/marketing-category.test.ts
// @description Asserts the landing-page widget pack is declared under the
//   `marketing` manifest category. Before the 2026-06-09 enrich, these widgets
//   reported layout/display/input — which buried them when an agent filtered
//   the catalog by conversion role. This test pins the category so the pack
//   stays discoverable as a group.
// @created 2026-06-09 — marketing-pack enrich (ITEM 5).
import { describe, expect, it } from 'vitest';
import { manifestEntries } from './index.js';

/** The conversion-role widgets that make up a Paw Sites landing page. */
const MARKETING_TYPES = [
  'navbar',
  'marketing-hero',
  'feature-grid',
  'testimonial',
  'cta',
  'logo-cloud',
  'footer',
  'faq',
  // newsletter lives in the marketing folder too; it is categorized marketing
  // even though it is NOT static-safe (covered by static-safe.test.ts).
  'newsletter',
] as const;

describe('marketing manifest category', () => {
  const byType = new Map(manifestEntries.map((e) => [e.type, e]));

  it('every marketing widget has a manifest entry', () => {
    const missing = MARKETING_TYPES.filter((t) => !byType.has(t));
    expect(missing).toEqual([]);
  });

  it("every marketing widget carries category 'marketing'", () => {
    const offenders = MARKETING_TYPES
      .map((t) => byType.get(t))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .filter((e) => e.category !== 'marketing')
      .map((e) => `${e.type} -> ${e.category}`);
    expect(offenders).toEqual([]);
  });

  it('the new faq and marketing-hero entries are registered under marketing', () => {
    expect(byType.get('faq')?.category).toBe('marketing');
    expect(byType.get('marketing-hero')?.category).toBe('marketing');
  });
});
