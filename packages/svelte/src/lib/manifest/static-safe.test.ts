// @file manifest/static-safe.test.ts
// @description Asserts the Tier-0 `staticSafe` flag on the marketing pack. Paw
//   Sites landing pages render PRERENDERED with JavaScript OFF (csr=false), so
//   only widgets whose resting state is baked into markup may be placed there.
//   This test pins which marketing widgets are safe (navbar, hero, feature-grid,
//   testimonial, cta, logo-cloud, footer, faq) and which is explicitly NOT
//   (newsletter — its email-capture form needs client JS).
// @created 2026-06-09 — marketing-pack enrich (ITEM 5).
import { describe, expect, it } from 'vitest';
import { manifestEntries, buildManifest } from './index.js';

const STATIC_SAFE_TYPES = [
  'navbar',
  'marketing-hero',
  'feature-grid',
  'testimonial',
  'cta',
  'logo-cloud',
  'footer',
  'faq',
] as const;

/** Marketing widgets that need client JS — must be flagged NOT static-safe. */
const NOT_STATIC_SAFE_TYPES = ['newsletter'] as const;

describe('manifest staticSafe flag', () => {
  const byType = new Map(manifestEntries.map((e) => [e.type, e]));

  it('the schema carries staticSafe through buildManifest', () => {
    const m = buildManifest();
    const navbar = m.widgets.find((w) => w.type === 'navbar');
    expect(navbar?.staticSafe).toBe(true);
    const newsletter = m.widgets.find((w) => w.type === 'newsletter');
    expect(newsletter?.staticSafe).toBe(false);
  });

  it('every static-safe marketing widget is flagged staticSafe: true', () => {
    const offenders = STATIC_SAFE_TYPES
      .map((t) => byType.get(t))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .filter((e) => e.staticSafe !== true)
      .map((e) => `${e.type} -> ${String(e.staticSafe)}`);
    expect(offenders).toEqual([]);
  });

  it('JS-needing marketing widgets are explicitly flagged staticSafe: false', () => {
    for (const t of NOT_STATIC_SAFE_TYPES) {
      expect(byType.get(t)?.staticSafe).toBe(false);
    }
  });

  it('staticSafe, when present, is a boolean (no truthy strings)', () => {
    const offenders = manifestEntries
      .filter((e) => e.staticSafe !== undefined && typeof e.staticSafe !== 'boolean')
      .map((e) => e.type);
    expect(offenders).toEqual([]);
  });
});
