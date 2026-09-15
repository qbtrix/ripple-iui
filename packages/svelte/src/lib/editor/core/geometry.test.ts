// editor/core/geometry.test.ts
// @description SP-1a unit tests for the L1 pure rect math (no Svelte, no real
//   layout needed): pointInRect (edge-inclusive), rectToStyle, rectArea
//   (negative-dim clamp), relativeRect (origin re-base, size preserved).
// @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
import { describe, expect, it } from 'vitest';
import { pointInRect, rectToStyle, rectArea, relativeRect, type Rect } from './geometry.js';

function r(left: number, top: number, width: number, height: number): Rect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

describe('geometry.pointInRect', () => {
  const box = r(10, 20, 100, 50); // left10 top20 right110 bottom70

  it('is true strictly inside', () => {
    expect(pointInRect(box, 50, 40)).toBe(true);
  });

  it('is true on the edges (inclusive)', () => {
    expect(pointInRect(box, 10, 20)).toBe(true);
    expect(pointInRect(box, 110, 70)).toBe(true);
  });

  it('is false just outside each side', () => {
    expect(pointInRect(box, 9, 40)).toBe(false); // left
    expect(pointInRect(box, 111, 40)).toBe(false); // right
    expect(pointInRect(box, 50, 19)).toBe(false); // top
    expect(pointInRect(box, 50, 71)).toBe(false); // bottom
  });
});

describe('geometry.rectToStyle', () => {
  it('emits left/top/width/height in px', () => {
    expect(rectToStyle(r(12, 34, 56, 78))).toBe('left:12px;top:34px;width:56px;height:78px;');
  });
});

describe('geometry.rectArea', () => {
  it('is width * height', () => {
    expect(rectArea(r(0, 0, 4, 5))).toBe(20);
  });

  it('clamps negative dimensions to 0', () => {
    expect(rectArea({ left: 0, top: 0, right: 0, bottom: 0, width: -3, height: 5 })).toBe(0);
  });
});

describe('geometry.relativeRect', () => {
  it('subtracts the origin and preserves width/height', () => {
    const abs = r(100, 200, 30, 40); // right130 bottom240
    const rel = relativeRect(abs, { left: 100, top: 150 });
    expect(rel).toEqual({ left: 0, top: 50, right: 30, bottom: 90, width: 30, height: 40 });
  });
});
