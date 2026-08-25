// slides-partition.test.ts — SP-4 unit tests for the pure slide-partition logic.
// Created 2026-06-28.
//
// Covers the partition precedence (sections → ui.children → whole ui → none) and
// the navigation index clamp. No DOM / no Ripple context — this is the framework
// -free core the SlidesLayout component and the later deck export both rely on.
import { describe, it, expect } from 'vitest';
import { partitionSlides, clampIndex } from '../slides-partition.js';
import type { UINode } from '@ripple-ui/core';

const node = (text: string): UINode => ({ type: 'heading', props: { text } });

describe('partitionSlides', () => {
  it('splits ui.children into one slide per top-level child', () => {
    const spec = {
      version: '2.0' as const,
      intent: 'slides' as const,
      ui: { type: 'container', children: [node('a'), node('b'), node('c')] }
    };
    const slides = partitionSlides(spec);
    expect(slides).toHaveLength(3);
    expect(slides[0]).toBe(spec.ui.children[0]);
    expect(slides[2]).toBe(spec.ui.children[2]);
  });

  it('prefers an explicit sections array over ui.children', () => {
    const spec = {
      version: '2.0' as const,
      intent: 'slides' as const,
      sections: [node('s1'), node('s2')],
      ui: { type: 'container', children: [node('ignored')] }
    };
    const slides = partitionSlides(spec);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toBe(spec.sections[0]);
  });

  it('falls back to the whole ui as a single slide when there are no children', () => {
    const ui = { type: 'card', props: { title: 'solo' } };
    const slides = partitionSlides({ version: '2.0' as const, intent: 'slides' as const, ui });
    expect(slides).toHaveLength(1);
    expect(slides[0]).toBe(ui);
  });

  it('treats an empty children array as no children (single-slide fallback)', () => {
    const ui = { type: 'container', children: [] as UINode[] };
    const slides = partitionSlides({ version: '2.0' as const, intent: 'slides' as const, ui });
    expect(slides).toHaveLength(1);
    expect(slides[0]).toBe(ui);
  });

  it('returns no slides when there is no ui and no sections', () => {
    expect(partitionSlides({ version: '2.0' as const, intent: 'slides' as const })).toHaveLength(0);
  });

  it('is null-safe', () => {
    expect(partitionSlides(null)).toEqual([]);
    expect(partitionSlides(undefined)).toEqual([]);
  });

  it('filters non-object entries out of a source array', () => {
    const spec = {
      version: '2.0' as const,
      intent: 'slides' as const,
      ui: {
        type: 'container',
        // null / falsy entries should never become slides.
        children: [node('a'), null, undefined, node('b')] as unknown as UINode[]
      }
    };
    expect(partitionSlides(spec)).toHaveLength(2);
  });
});

describe('clampIndex', () => {
  it('keeps an in-range index unchanged', () => {
    expect(clampIndex(2, 5)).toBe(2);
  });

  it('clamps below the start to 0 (no wrap)', () => {
    expect(clampIndex(-3, 5)).toBe(0);
  });

  it('clamps past the end to the last index (no wrap)', () => {
    expect(clampIndex(9, 5)).toBe(4);
  });

  it('clamps to 0 for an empty deck', () => {
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(3, 0)).toBe(0);
  });

  it('is finite-safe and integer-floored', () => {
    expect(clampIndex(NaN, 5)).toBe(0);
    expect(clampIndex(2.9, 5)).toBe(2);
  });
});
