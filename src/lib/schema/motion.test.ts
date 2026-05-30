// @file schema/motion.test.ts
// @description Parse/default/reject tests for the `motion` Zod schema.
// @created 2026-05-30 — RFC 12 (Paw Sites) animation primitive, Task 1.1.

import { describe, expect, it } from 'vitest';
import { Motion } from './motion.js';

describe('Motion schema', () => {
  it('accepts a minimal enter-only motion', () => {
    const r = Motion.safeParse({ enter: { opacity: 0, y: 20 } });
    expect(r.success).toBe(true);
  });

  it('defaults reduceMotion to "cross-fade"', () => {
    const r = Motion.parse({});
    expect(r.reduceMotion).toBe('cross-fade');
  });

  it('accepts x/y as number or string', () => {
    expect(Motion.safeParse({ enter: { x: 10 } }).success).toBe(true);
    expect(Motion.safeParse({ enter: { x: '2rem' } }).success).toBe(true);
  });

  it('defaults inView.once to true and amount to 0.2', () => {
    const r = Motion.parse({ inView: { y: 0 } });
    expect(r.inView?.once).toBe(true);
    expect(r.inView?.amount).toBe(0.2);
  });

  it('accepts a stagger object with from/direction defaults', () => {
    const r = Motion.parse({ stagger: { each: 0.05 } });
    expect(r.stagger).toMatchObject({ each: 0.05, from: 'first', direction: 'normal' });
  });

  it('accepts a transition preset', () => {
    expect(Motion.safeParse({ transition: { preset: 'snappy' } }).success).toBe(true);
  });

  it('rejects a transition bounce above 1', () => {
    expect(Motion.safeParse({ transition: { bounce: 2 } }).success).toBe(false);
  });

  it('accepts a scroll directive', () => {
    const r = Motion.safeParse({ scroll: { property: 'y', from: 0, to: 100 } });
    expect(r.success).toBe(true);
  });
});
