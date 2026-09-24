// src/lib/actions/with-motion.test.ts
// @file actions/with-motion.test.ts
// @description Behavior tests (jsdom) for the withMotion Svelte action:
//   returns destroy, paints the enter "from" frame on mount, honors
//   prefers-reduced-motion (opacity-only), and attaches hover listeners.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.7.
// @changes
//   - 2026-05-30 (PR #45 motion runtime close-out): FIX 1 — inView arms with the
//     FULL from-state (opacity + transform + filter), not opacity alone. FIX 2 —
//     transition.delay (SECONDS) wires into the Tier-0 transition-delay on both
//     enter and inView. FIX 3 — motion.scroll wires scroll-bound styling/observer.
//   - 2026-05-30 (PR #45 degrade-to-visible fix): DEGRADE-TO-VISIBLE coverage. A
//     spring-preset enter now lands at rest via the Tier-0 CSS path BY DEFAULT
//     (it must end transform:none + opacity:'' — visible, never the collapsed
//     zero-matrix). And when the opt-in Tier-1 enter path is on, the node STILL
//     ends visible whether loadAnimate() resolves null OR animate() throws —
//     mocking load-tier1 proves the engine-missing path can't strand it hidden.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { withMotion, playMotion } from './with-motion.js';
import * as loadTier1 from '@ripple-ui/core';
import type { Motion } from '@ripple-ui/core';

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

/** Resolve after the enter's double-rAF AND any pending microtasks (the Tier-1
 *  fallback chains a `.then`/`.catch` off loadAnimate()). */
async function settleEnter(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  // Flush the loadAnimate() promise chain (and its fallback) a couple of ticks.
  await Promise.resolve();
  await Promise.resolve();
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

  // ── FIX 1: inView arms with the FULL from-state (opacity + transform) ──────
  it('inView arms the FULL from-state — opacity AND translateY, not opacity alone', () => {
    const el = makeEl();
    const handle = withMotion(el, { inView: { opacity: 0, y: 28 } } as Motion);
    // The initial inline style must carry BOTH the fade and the rise.
    expect(el.style.opacity).toBe('0');
    expect(el.style.transform).toMatch(/translateY\(28px\)/);
    handle?.destroy?.();
  });

  it('inView arms x / scale / blur channels too (full from-state, not just y)', () => {
    const el = makeEl();
    const handle = withMotion(el, { inView: { opacity: 0, x: -16, scale: 0.9, blur: 4 } } as Motion);
    expect(el.style.transform).toMatch(/translateX\(-16px\)/);
    expect(el.style.transform).toMatch(/scale\(0\.9\)/);
    expect(el.style.filter).toMatch(/blur\(4px\)/);
    handle?.destroy?.();
  });

  // ── FIX 2: transition.delay (SECONDS) -> non-zero transition-delay ─────────
  it('enter wires transition.delay (seconds) into a non-zero transition-delay', async () => {
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth', delay: 0.12 } } as Motion);
    // The enter runs on a double-rAF; wait for it, then read transition-delay.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    expect(el.style.transitionDelay).not.toBe('');
    expect(el.style.transitionDelay).not.toBe('0s');
    expect(el.style.transitionDelay).not.toBe('0ms');
    // 0.12s author intent -> 120ms on the CSS path.
    expect(el.style.transitionDelay).toMatch(/120ms|0\.12s/);
    handle?.destroy?.();
  });

  // ── DEGRADE-TO-VISIBLE: an entered element ALWAYS ends visible ─────────────
  // The invisible-hero regression class: a spring-preset enter must NOT depend on
  // a JS engine to become visible. These tests assert the resting (visible) state
  // is reached on the Tier-0 path by default, and on the opt-in Tier-1 path even
  // when the engine is unavailable or throws.

  it('spring-preset enter lands at REST (visible) by default — no JS engine needed', async () => {
    const el = makeEl();
    // `snappy` is a SPRING preset → the old code routed this to Tier 1 and asked
    // motion.dev to spring toward transform:'none', collapsing the box to a zero
    // matrix. The default path is now pure Tier-0 CSS: it must end at rest.
    const handle = withMotion(el, { enter: { opacity: 0, y: 24 }, transition: { preset: 'snappy' } } as Motion);
    // From-frame armed on mount: opacity 0 + translateY(24px).
    expect(el.style.opacity).toBe('0');
    expect(el.style.transform).toMatch(/translateY\(24px\)/);
    await settleEnter();
    // Settled VISIBLE: transform cleared to none, opacity cleared to inherit (1).
    expect(el.style.transform).toBe('none');
    expect(el.style.opacity).toBe('');
    handle?.destroy?.();
  });

  it('opt-in Tier-1 enter STILL ends visible when loadAnimate() resolves null', async () => {
    // Engine unavailable / import hiccup — loadAnimate resolves null. The node
    // must NOT be left stuck in the hidden from-frame.
    const spy = vi.spyOn(loadTier1, 'loadAnimate').mockResolvedValue(null);
    (globalThis as Record<string, unknown>).__RIPPLE_TIER1_ENTER__ = true;
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 24 }, transition: { preset: 'snappy' } } as Motion);
    await settleEnter();
    expect(spy).toHaveBeenCalled();
    // Degraded to the Tier-0 reveal: visible at rest.
    expect(el.style.transform).toBe('none');
    expect(el.style.opacity).toBe('');
    handle?.destroy?.();
    delete (globalThis as Record<string, unknown>).__RIPPLE_TIER1_ENTER__;
    spy.mockRestore();
  });

  it('opt-in Tier-1 enter STILL ends visible when animate() throws', async () => {
    // The engine loads but the animate call throws — must fall back to visible.
    const spy = vi.spyOn(loadTier1, 'loadAnimate').mockResolvedValue((() => {
      throw new Error('boom');
    }) as unknown as Awaited<ReturnType<typeof loadTier1.loadAnimate>>);
    (globalThis as Record<string, unknown>).__RIPPLE_TIER1_ENTER__ = true;
    const el = makeEl();
    const handle = withMotion(el, { enter: { opacity: 0, y: 24 }, transition: { preset: 'snappy' } } as Motion);
    await settleEnter();
    expect(el.style.transform).toBe('none');
    expect(el.style.opacity).toBe('');
    handle?.destroy?.();
    delete (globalThis as Record<string, unknown>).__RIPPLE_TIER1_ENTER__;
    spy.mockRestore();
  });

  it('inView wires transition.delay (seconds) into a non-zero transition-delay on reveal', () => {
    const el = makeEl();
    type IOCb = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
    const holder: { cb: IOCb | null } = { cb: null };
    class FakeIO {
      constructor(cb: IOCb) { holder.cb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', FakeIO as unknown as typeof IntersectionObserver);
    const handle = withMotion(el, { inView: { opacity: 0, y: 28 }, transition: { preset: 'smooth', delay: 0.24 } } as Motion);
    // Fire the observer with an intersecting entry.
    holder.cb?.([{ isIntersecting: true, target: el }]);
    expect(el.style.transitionDelay).toMatch(/240ms|0\.24s/);
    handle?.destroy?.();
    vi.unstubAllGlobals();
  });

  // ── FIX 3: motion.scroll wires the robust rAF scroll path ──────────────────
  it('motion.scroll wires the rAF scroll path and tags the element', () => {
    const el = makeEl();
    const handle = withMotion(el, { scroll: { property: 'y', from: 60, to: -60, range: 'cover' } } as Motion);
    // The IntersectionObserver + scroll-rAF loop is now the single robust path
    // (the inert CSS view-timeline path was removed — see wireScroll). The
    // element must be tagged scroll-wired.
    expect(el.dataset.rippleScroll).toBe('raf');
    handle?.destroy?.();
  });

  it('motion.scroll paints an initial transform frame from the scroll progress', () => {
    const el = makeEl();
    // jsdom getBoundingClientRect returns zeros, so progress resolves to a
    // deterministic value and the channel is written immediately — the point is
    // that SOMETHING lands on transform synchronously (no first-scroll jump),
    // not the exact px. A `y` channel writes translateY.
    const handle = withMotion(el, { scroll: { property: 'y', from: 80, to: -80, range: 'cover' } } as Motion);
    expect(el.style.transform).toMatch(/translateY\(/);
    handle?.destroy?.();
  });

  // ── playMotion: the one-shot imperative player (the `animate` runtime) ─────
  /** The peak (offset 0.5) keyframe playMotion hands to WAAPI. */
  function peakTransform(spy: ReturnType<typeof vi.spyOn>): string {
    const frames = spy.mock.calls[0][0] as Keyframe[];
    return String(frames.find((f) => f.offset === 0.5)?.transform ?? '');
  }

  it('playMotion pulses the node toward the first present interaction frame', () => {
    const el = makeEl();
    // jsdom now ships Element.animate, so the WAAPI path runs (it does not write
    // inline style). Spy on it and assert the peak keyframe carries the gesture.
    const spy = vi.spyOn(el, 'animate').mockReturnValue({} as Animation);
    const played = playMotion(el, { enter: { scale: 1.35, y: -14 }, transition: { preset: 'bouncy' } } as Motion);
    expect(played).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
    expect(peakTransform(spy)).toMatch(/scale\(1\.35\)/);
    expect(peakTransform(spy)).toMatch(/translateY\(-14px\)/);
  });

  it('playMotion picks hover when there is no enter frame', () => {
    const el = makeEl();
    const spy = vi.spyOn(el, 'animate').mockReturnValue({} as Animation);
    playMotion(el, { hover: { scale: 1.1 } } as Motion);
    expect(peakTransform(spy)).toMatch(/scale\(1\.1\)/);
  });

  it('playMotion falls back to an inline-style pulse where WAAPI is absent', () => {
    const el = makeEl();
    // Force the no-WAAPI branch (older engines / non-browser unit envs).
    Object.defineProperty(el, 'animate', { value: undefined, configurable: true });
    const played = playMotion(el, { enter: { scale: 1.35, y: -14 } } as Motion);
    expect(played).toBe(true);
    expect(el.style.transform).toMatch(/scale\(1\.35\)/);
    expect(el.style.transform).toMatch(/translateY\(-14px\)/);
  });

  it('playMotion returns false when the motion carries no animatable frame', () => {
    const el = makeEl();
    expect(playMotion(el, { transition: { preset: 'smooth' } } as Motion)).toBe(false);
    expect(playMotion(el, undefined)).toBe(false);
  });

  it('playMotion reduced-motion drops the transform to an opacity-only blink', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; },
    }));
    const el = makeEl();
    playMotion(el, { enter: { scale: 1.4, y: -20, opacity: 0.4 } } as Motion);
    // The scale / translate are stripped under reduced-motion; only opacity moves.
    expect(/scale|translate/.test(el.style.transform)).toBe(false);
    vi.unstubAllGlobals();
  });

  // ── BONUS: opt-in debug logging gated behind the global flag ──────────────
  it('logs to console when __RIPPLE_MOTION_DEBUG__ is on, silent when off', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    // off by default
    const off = withMotion(makeEl(), { enter: { opacity: 0 } } as Motion);
    const calledWhileOff = spy.mock.calls.length;
    off?.destroy?.();
    expect(calledWhileOff).toBe(0);
    // on
    (globalThis as Record<string, unknown>).__RIPPLE_MOTION_DEBUG__ = true;
    const on = withMotion(makeEl(), { enter: { opacity: 0 } } as Motion);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
    on?.destroy?.();
    delete (globalThis as Record<string, unknown>).__RIPPLE_MOTION_DEBUG__;
    spy.mockRestore();
  });
});
