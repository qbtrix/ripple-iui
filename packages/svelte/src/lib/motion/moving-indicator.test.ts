// src/lib/motion/moving-indicator.test.ts
// @file motion/moving-indicator.test.ts
// @description jsdom unit coverage for the generic `movingIndicator` action.
//   jsdom has no layout engine (offset* default 0), so we STUB each item's
//   offset box and assert the WIRING: the highlight gets positioned to the
//   active sibling's box; all three `active` forms (index / resolver / { match }
//   predicate) resolve correctly; the FF token drives the CSS transition
//   duration; null-active hides the highlight; `inset` grows the box; reduced
//   motion drops the positional transition; the `onMeasure` hatch fires. The
//   REAL pixel glide between items is proven in e2e/motion.spec.ts (real
//   Chromium), since only a browser reports a non-zero computed box.
// @created 2026-05-30 — RFC 12: generic moving-indicator primitive.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { movingIndicator, type IndicatorRect } from './moving-indicator.js';
import { FF_SPRING_TOKENS } from '@ripple-ui/core';

/** Give an element a fake offset box (jsdom reports 0 for all of them). */
function stubBox(el: HTMLElement, box: IndicatorRect) {
  Object.defineProperty(el, 'offsetTop', { value: box.top, configurable: true });
  Object.defineProperty(el, 'offsetLeft', { value: box.left, configurable: true });
  Object.defineProperty(el, 'offsetWidth', { value: box.width, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { value: box.height, configurable: true });
}

/** Build a container with `n` stub-boxed item rows + a highlight node. */
function makeGroup(boxes: IndicatorRect[]) {
  const container = document.createElement('div');
  const highlight = document.createElement('div');
  const items: HTMLElement[] = boxes.map((box) => {
    const el = document.createElement('div');
    stubBox(el, box);
    container.appendChild(el);
    return el;
  });
  container.appendChild(highlight);
  document.body.appendChild(container);
  return { container, highlight, items };
}

const ROWS: IndicatorRect[] = [
  { top: 0, left: 0, width: 200, height: 30 },
  { top: 30, left: 0, width: 200, height: 30 },
  { top: 60, left: 0, width: 200, height: 30 },
];

describe('movingIndicator action', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('positions the highlight to the active item box (numeric index)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 1,
    });
    // Row index 1 sits at top:30, height:30.
    expect(highlight.style.top).toBe('30px');
    expect(highlight.style.height).toBe('30px');
    expect(highlight.style.width).toBe('200px');
    expect(highlight.style.opacity).toBe('1');
    handle.destroy();
  });

  it('hides (opacity 0) when active is null — the "no active" case', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: null,
    });
    expect(highlight.style.opacity).toBe('0');
    handle.destroy();
  });

  it('resolves active via a RESOLVER function form', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      // pick the LAST item via a resolver
      active: (els) => els.length - 1,
    });
    expect(highlight.style.top).toBe('60px'); // row 2
    handle.destroy();
  });

  it('resolves active via a { match } PREDICATE (first match wins)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    items[2].setAttribute('data-selected', 'true');
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: { match: (el) => el.getAttribute('data-selected') === 'true' },
    });
    expect(highlight.style.top).toBe('60px'); // matched row 2
    handle.destroy();
  });

  it('drives the transition with the FF token duration (fast = 80ms by default)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, { container, items: () => items, active: 0 });
    // Default token is FF fast (80ms). The positional props must carry it.
    expect(highlight.style.transition).toContain('top 80ms');
    expect(highlight.style.transition).toContain('width 80ms');
    handle.destroy();
  });

  it('honors a custom token (moderate = 160ms)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 0,
      token: FF_SPRING_TOKENS.moderate,
    });
    expect(highlight.style.transition).toContain('top 160ms');
    handle.destroy();
  });

  it("axis:'x' transitions only left/width (a horizontal underline)", () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 0,
      axis: 'x',
    });
    const t = highlight.style.transition;
    expect(t).toContain('left 80ms');
    expect(t).toContain('width 80ms');
    expect(t).not.toContain('top 80ms');
    expect(t).not.toContain('height 80ms');
    handle.destroy();
  });

  it('applies inset uniformly (a focus-ring sits 2px outside)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 0,
      inset: 2,
    });
    // row 0 is {top:0,left:0,w:200,h:30}; inset 2 → top -2, left -2, w 204, h 34
    expect(highlight.style.top).toBe('-2px');
    expect(highlight.style.left).toBe('-2px');
    expect(highlight.style.width).toBe('204px');
    expect(highlight.style.height).toBe('34px');
    handle.destroy();
  });

  it('reduced motion drops the positional transition (the box JUMPS)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 1,
      reducedMotion: true,
    });
    // Position is still set, but no top/width transition — only opacity fades.
    expect(highlight.style.top).toBe('30px');
    expect(highlight.style.transition).not.toContain('top 80ms');
    expect(highlight.style.transition).toContain('opacity');
    handle.destroy();
  });

  it('fires onMeasure with the measured rects (consumer escape hatch)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const onMeasure = vi.fn();
    const handle = movingIndicator(highlight, {
      container,
      items: () => items,
      active: 0,
      onMeasure,
    });
    expect(onMeasure).toHaveBeenCalled();
    const rects = onMeasure.mock.calls[0][0] as IndicatorRect[];
    expect(rects[1]).toEqual({ top: 30, left: 0, width: 200, height: 30 });
    handle.destroy();
  });

  it('update() re-reads active and re-positions to the new item', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, { container, items: () => items, active: 0 });
    expect(highlight.style.top).toBe('0px');
    handle.update({ container, items: () => items, active: 2 });
    expect(highlight.style.top).toBe('60px');
    handle.destroy();
  });

  it('defaults the highlight to position:absolute + will-change for the compositor', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, { container, items: () => items, active: 0 });
    expect(highlight.style.position).toBe('absolute');
    expect(highlight.style.willChange).toContain('top');
    handle.destroy();
  });

  it('accepts a lazy container getter (() => el)', () => {
    const { container, highlight, items } = makeGroup(ROWS);
    const handle = movingIndicator(highlight, {
      container: () => container,
      items: () => items,
      active: 1,
    });
    expect(highlight.style.top).toBe('30px');
    handle.destroy();
  });
});
