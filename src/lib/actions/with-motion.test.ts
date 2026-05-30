// src/lib/actions/with-motion.test.ts
// @file actions/with-motion.test.ts
// @description Behavior tests (jsdom) for the withMotion Svelte action:
//   returns destroy, paints the enter "from" frame on mount, honors
//   prefers-reduced-motion (opacity-only), and attaches hover listeners.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.7.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { withMotion } from './with-motion.js';
import type { Motion } from '../schema/motion.js';

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('withMotion action', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('returns a destroy fn and does not throw on mount', () => {
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } } as Motion);
    expect(typeof handle?.destroy).toBe('function');
    handle?.destroy?.();
  });

  it('paints the initial (pre-animation) frame on mount for an enter', () => {
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } } as Motion);
    // Synchronously after mount the element should carry the "from" opacity.
    expect(el.style.opacity).toBe('0');
    handle?.destroy?.();
  });

  it('reduced-motion strips the y offset (opacity-only)', () => {
    // Force matchMedia to report reduced-motion.
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; },
    }));
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 40 }, reduceMotion: 'cross-fade' } as Motion);
    // No translate should be applied — only opacity.
    expect(el.style.transform === '' || !/translate/.test(el.style.transform)).toBe(true);
    handle?.destroy?.();
    vi.unstubAllGlobals();
  });

  it('attaches a hover listener that applies the hover frame', () => {
    const el = makeEl();
    const handle = withMotion(el, { hover: { scale: 1.1 } } as Motion);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(el.style.transform).toMatch(/scale\(1\.1\)/);
    el.dispatchEvent(new MouseEvent('mouseleave'));
    handle?.destroy?.();
  });
});
