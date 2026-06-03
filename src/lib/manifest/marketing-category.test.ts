// @file manifest/marketing-category.test.ts
// @created 2026-06-03 — Paw Sites landing brain (Phase R / Task R1).
// Asserts the 7-widget marketing pack is filed under category 'marketing' so
// the Paw Sites authoring brain can discover it. The manifest entry id field
// is `type` (kebab-case), exported via `manifestEntries` from ./index.
import { describe, it, expect } from 'vitest';
import { manifestEntries } from './index.js';

describe('marketing manifest category', () => {
  const names = ['cta', 'feature-grid', 'testimonial', 'navbar', 'footer', 'newsletter', 'logo-cloud'];

  it('files the marketing pack under category "marketing"', () => {
    for (const n of names) {
      const e = manifestEntries.find((w) => w.type === n);
      expect(e, `${n} missing`).toBeTruthy();
      expect(e!.category, `${n} category`).toBe('marketing');
    }
  });
});
