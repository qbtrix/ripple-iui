// layout-engine.test.ts — Unit tests for the Ripple layout engine.
// Created: 2026-03-27 — Tests for determineLayout and analyzeData functions.
import { describe, it, expect } from 'vitest';
import { determineLayout, analyzeData } from '../layout-engine.js';

// Helper to build a minimal spec
function spec(overrides: Record<string, any> = {}) {
  return {
    version: '2' as const,
    intent: 'browse',
    title: 'Test',
    ...overrides,
  } as any;
}

// =============================================================================
// determineLayout
// =============================================================================

describe('determineLayout', () => {
  it('returns "dashboard" for intent="dashboard"', () => {
    expect(determineLayout(spec({ intent: 'dashboard' }))).toBe('dashboard');
  });

  it('returns "custom" for intent="custom"', () => {
    expect(determineLayout(spec({ intent: 'custom' }))).toBe('custom');
  });

  it('returns "card-grid" for browse intent with images', () => {
    const s = spec({
      intent: 'browse',
      fields: { image: 'img' },
      data: { items: [{ img: 'http://example.com/a.png', title: 'A' }] },
    });
    expect(determineLayout(s)).toBe('card-grid');
  });

  it('returns "list" for browse intent without images', () => {
    const s = spec({
      intent: 'browse',
      data: { items: [{ title: 'A' }] },
    });
    expect(determineLayout(s)).toBe('list');
  });

  it('returns "form-simple" for form intent with few fields', () => {
    const s = spec({
      intent: 'form',
      form_fields: [{ name: 'name' }, { name: 'email' }],
    });
    expect(determineLayout(s)).toBe('form-simple');
  });

  it('returns "form-sections" for form intent with many fields', () => {
    const fields = Array.from({ length: 8 }, (_, i) => ({ name: `field${i}` }));
    const s = spec({ intent: 'form', form_fields: fields });
    expect(determineLayout(s)).toBe('form-sections');
  });

  it('returns "summary-card" for confirm intent without form fields', () => {
    expect(determineLayout(spec({ intent: 'confirm' }))).toBe('summary-card');
  });

  it('returns "form-simple" for confirm intent with form fields', () => {
    const s = spec({ intent: 'confirm', form_fields: [{ name: 'x' }] });
    expect(determineLayout(s)).toBe('form-simple');
  });

  it('returns "search-results" for search intent', () => {
    expect(determineLayout(spec({ intent: 'search' }))).toBe('search-results');
  });

  it('returns "action-buttons" for action intent', () => {
    expect(determineLayout(spec({ intent: 'action' }))).toBe('action-buttons');
  });

  it('returns "workspace" for workspace intent', () => {
    expect(determineLayout(spec({ intent: 'workspace' }))).toBe('workspace');
  });

  it('returns "widget" for widget intent', () => {
    expect(determineLayout(spec({ intent: 'widget' }))).toBe('widget');
  });

  it('returns "itinerary" for itinerary intent', () => {
    expect(determineLayout(spec({ intent: 'itinerary' }))).toBe('itinerary');
  });

  it('returns "list" for unknown intent', () => {
    expect(determineLayout(spec({ intent: 'unknown_thing' }))).toBe('list');
  });

  // Display hint override
  it('respects display.layout hint when set', () => {
    const s = spec({
      intent: 'browse',
      display: { layout: 'table' },
      data: { items: [{ a: 1 }] },
    });
    expect(determineLayout(s)).toBe('table');
  });

  it('ignores display.layout="auto" and auto-determines', () => {
    const s = spec({
      intent: 'search',
      display: { layout: 'auto' },
    });
    expect(determineLayout(s)).toBe('search-results');
  });

  // Browse sub-layouts
  it('returns "image-grid" for browse with images and many items', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      img: `http://example.com/${i}.png`,
      title: `Item ${i}`,
    }));
    const s = spec({
      intent: 'browse',
      fields: { image: 'img' },
      data: { items },
    });
    expect(determineLayout(s)).toBe('image-grid');
  });

  it('returns "icon-grid" for browse with icons but no images', () => {
    const s = spec({
      intent: 'browse',
      fields: { icon: 'ico' },
      data: { items: [{ ico: 'star', title: 'A' }] },
    });
    expect(determineLayout(s)).toBe('icon-grid');
  });

  // Info sub-layouts
  it('returns "info-hero" for info intent with single item', () => {
    const s = spec({
      intent: 'info',
      data: { items: [{ value: 42 }] },
    });
    expect(determineLayout(s)).toBe('info-hero');
  });

  it('returns "info-grid" for info intent with multiple items', () => {
    const s = spec({
      intent: 'info',
      data: { items: [{ value: 1 }, { value: 2 }] },
    });
    expect(determineLayout(s)).toBe('info-grid');
  });

  // Detail sub-layouts
  it('returns "detail-hero" for detail with images', () => {
    const s = spec({
      intent: 'detail',
      fields: { image: 'img' },
      data: { items: [{ img: 'http://example.com/a.png' }] },
    });
    expect(determineLayout(s)).toBe('detail-hero');
  });

  it('returns "detail-simple" for detail without images', () => {
    const s = spec({
      intent: 'detail',
      data: { items: [{ title: 'A' }] },
    });
    expect(determineLayout(s)).toBe('detail-simple');
  });

  // Display hint mappings
  it('maps display.layout="cards" to "card-grid" when images present', () => {
    const s = spec({
      intent: 'browse',
      display: { layout: 'cards' },
      fields: { image: 'img' },
      data: { items: [{ img: 'x' }] },
    });
    expect(determineLayout(s)).toBe('card-grid');
  });

  it('maps display.layout="carousel" to "scrollable-list"', () => {
    const s = spec({
      intent: 'browse',
      display: { layout: 'carousel' },
    });
    expect(determineLayout(s)).toBe('scrollable-list');
  });

  it('maps display.layout="hero" to "info-hero"', () => {
    const s = spec({
      intent: 'info',
      display: { layout: 'hero' },
    });
    expect(determineLayout(s)).toBe('info-hero');
  });
});

// =============================================================================
// analyzeData
// =============================================================================

describe('analyzeData', () => {
  it('returns 0 items for spec with no data', () => {
    const result = analyzeData(spec());
    expect(result.itemCount).toBe(0);
    expect(result.availableFields.size).toBe(0);
  });

  it('returns 0 items for null data', () => {
    const result = analyzeData(spec({ data: null }));
    expect(result.itemCount).toBe(0);
  });

  it('returns 0 items for non-object data', () => {
    const result = analyzeData(spec({ data: 'hello' }));
    expect(result.itemCount).toBe(0);
  });

  it('returns 0 items when data has no items array', () => {
    const result = analyzeData(spec({ data: { other: 'stuff' } }));
    expect(result.itemCount).toBe(0);
  });

  it('counts items correctly', () => {
    const result = analyzeData(
      spec({ data: { items: [{ a: 1 }, { b: 2 }, { c: 3 }] } })
    );
    expect(result.itemCount).toBe(3);
  });

  it('collects unique field names across all items', () => {
    const result = analyzeData(
      spec({
        data: {
          items: [
            { title: 'A', price: 10 },
            { title: 'B', image: 'x.png' },
          ],
        },
      })
    );
    expect(result.availableFields).toEqual(new Set(['title', 'price', 'image']));
  });

  it('skips non-object items', () => {
    const result = analyzeData(
      spec({ data: { items: [null, 'string', { valid: true }] } })
    );
    expect(result.itemCount).toBe(3);
    expect(result.availableFields).toEqual(new Set(['valid']));
  });

  // FIX #3: fall back to data.stats when items is absent, matching the adapter.
  it('falls back to data.stats when items is absent', () => {
    const result = analyzeData(
      spec({
        intent: 'info',
        data: { stats: [{ label: 'Users', value: 42 }, { label: 'Churn', value: 3 }] },
      })
    );
    expect(result.itemCount).toBe(2);
    expect(result.availableFields).toEqual(new Set(['label', 'value']));
  });

  it('prefers items over stats when both present', () => {
    const result = analyzeData(
      spec({
        data: {
          items: [{ title: 'A' }],
          stats: [{ label: 'X', value: 1 }],
        },
      })
    );
    expect(result.itemCount).toBe(1);
    expect(result.availableFields).toEqual(new Set(['title']));
  });
});
