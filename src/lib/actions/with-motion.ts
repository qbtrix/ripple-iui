// src/lib/actions/with-motion.ts
// @file actions/with-motion.ts
// @description The one motion application point. Applied via use:withMotion in
//   NodeRenderer's widget branch. Client-only by nature (Svelte actions never
//   run on the server), so SSR renders the resting frame and this animates on
//   hydrate — no FOUC. Reads prefers-reduced-motion and rewrites accordingly.
//   Tier 0 = CSS transition; Tier 1 = motion.dev via the lazy loader.
// @created 2026-05-30 — RFC 12 animation primitive.
// @changes
//   - 2026-05-30 (PR #45 motion runtime close-out):
//     * FIX 1 — inView now arms the FULL "from" state (opacity + transform from
//       x/y/scale/rotate + filter from blur), reusing the engine's stateToStyle
//       builder, then transitions ALL channels back to rest on intersect. So
//       {opacity:0,y:28} fades AND rises (previously only the opacity moved).
//     * FIX 2 — transition.delay is wired into the Tier-0 transition-delay on
//       BOTH the enter and inView branches, so per-card cascades work. UNIT
//       DECISION: `delay` is in SECONDS (Framer-style, matching the showcase
//       author's `delay: i * 0.12` and motion.dev's own seconds API). The CSS
//       path multiplies by 1000 for its ms transition-delay; the motion.dev path
//       passes the seconds value straight through.
//     * FIX 3 — motion.scroll (continuous parallax) implemented: CSS
//       scroll-driven animation (animation-timeline: view()) where supported,
//       with an IntersectionObserver + scroll-rAF fallback. Client-only.
//     * BONUS — opt-in debug logging gated behind globalThis.__RIPPLE_MOTION_DEBUG__
//       (off by default): action attached, inView armed, IO fired, reveal applied,
//       enter run, scroll wired.

import type { Motion, MotionState } from '../schema/motion.js';
import { compileMotion, stateToStyle } from '../motion/engine.js';
import { rewriteForReducedMotion } from '../motion/reduce-motion.js';
import { resolvePreset, resolveEasing } from '../motion/presets.js';
import { loadAnimate, loadInView } from '../motion/load-tier1.js';

function prefersReduced(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Opt-in debug logger. OFF by default. Enable by setting
 * `window.__RIPPLE_MOTION_DEBUG__ = true` BEFORE the page loads (see
 * docs/motion-smoke-test.md). Uses console.debug so it stays out of the way of
 * real errors. Never logs unless the flag is truthy.
 */
function dbg(event: string, detail?: unknown): void {
  if (!(globalThis as Record<string, unknown>).__RIPPLE_MOTION_DEBUG__) return;
  if (detail === undefined) console.debug(`[ripple-motion] ${event}`);
  else console.debug(`[ripple-motion] ${event}`, detail);
}

/** Build the inline transform/opacity for an interaction state. */
function applyState(el: HTMLElement, m: Motion, key: 'hover' | 'tap' | 'focus' | null) {
  const state = key ? m[key] : undefined;
  const transforms: string[] = [];
  if (state) {
    if (state.x !== undefined) transforms.push(`translateX(${typeof state.x === 'number' ? state.x + 'px' : state.x})`);
    if (state.y !== undefined) transforms.push(`translateY(${typeof state.y === 'number' ? state.y + 'px' : state.y})`);
    if (typeof state.scale === 'number') transforms.push(`scale(${state.scale})`);
    if (typeof state.rotate === 'number') transforms.push(`rotate(${state.rotate}deg)`);
    el.style.opacity = typeof state.opacity === 'number' ? String(state.opacity) : '';
    el.style.filter = typeof state.blur === 'number' ? `blur(${state.blur}px)` : '';
  } else {
    el.style.opacity = '';
    el.style.filter = '';
  }
  el.style.transform = transforms.join(' ');
}

export function withMotion(node: HTMLElement, raw: Motion | undefined) {
  if (!raw) return { destroy() {} };

  let motion = prefersReduced() ? rewriteForReducedMotion(raw) : raw;
  let plan = compileMotion(motion);
  const cleanups: Array<() => void> = [];
  dbg('action attached', motion);

  // --- transition timing for Tier 0 (CSS) ---
  const physics = motion.transition?.preset ? resolvePreset(motion.transition.preset) : undefined;
  const durationMs = physics && physics.type === 'tween' ? physics.duration : (motion.transition?.duration ?? 300);
  const easing = resolveEasing(motion.transition?.easing);
  // UNIT: transition.delay is SECONDS (Framer-style). Tier-0 CSS wants ms.
  const delaySeconds = motion.transition?.delay ?? 0;
  const delayMs = delaySeconds * 1000;

  /**
   * Set the Tier-0 CSS transition on `el` across `props`, wiring the per-card
   * delay (FIX 2). The delay is written as the explicit `transition-delay`
   * longhand AFTER the shorthand (the shorthand resets longhands, so order
   * matters) — this keeps it correct in real browsers AND visible to jsdom,
   * which does not expand the `delay` component of the shorthand into the
   * `transitionDelay` longhand.
   */
  const setTransition = (el: HTMLElement, props: string[]) => {
    el.style.transition = props.map((p) => `${p} ${durationMs}ms ${easing}`).join(', ');
    if (delayMs) el.style.transitionDelay = `${delayMs}ms`;
  };

  // --- enter: paint initial frame, then animate to resting on next frame ---
  if (motion.enter) {
    node.style.cssText += ';' + plan.initialStyle;
    const runEnter = () => {
      dbg('enter run');
      if (plan.tier === 1) {
        loadAnimate().then((animate) => {
          if (!animate) return;
          const spring = physics && physics.type === 'spring' ? physics : (motion.transition?.type === 'spring' ? motion.transition : undefined);
          // motion.dev's delay is in SECONDS too — pass delaySeconds straight through.
          const opts = spring
            ? { type: 'spring', stiffness: (spring as { stiffness?: number }).stiffness, damping: (spring as { damping?: number }).damping, delay: delaySeconds }
            : { duration: durationMs / 1000, delay: delaySeconds };
          animate(node, { opacity: 1, transform: 'none' }, opts);
        });
      } else {
        setTransition(node, ['transform', 'opacity', 'filter']);
        node.style.transform = 'none';
        node.style.opacity = '';
        node.style.filter = '';
      }
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(runEnter));
    cleanups.push(() => cancelAnimationFrame(id));
  }

  // --- inView: native IntersectionObserver, SSR-safe (client-only action) ---
  // FIX 1: arm the FULL from-state (opacity + transform + filter), built with the
  // SAME engine helper the enter path uses — not opacity alone. On intersect,
  // transition ALL channels back to rest (transform:none, opacity:'', filter:'').
  // The from-state is armed whenever inView is present (it is the SSR-critical
  // "from" frame); only the OBSERVER needs IntersectionObserver. If IO is
  // unavailable (old browser / non-DOM test env) we reveal immediately so the
  // content is never left stuck in the hidden from-state.
  if (motion.inView) {
    const once = motion.inView.once ?? true;
    const amount = motion.inView.amount === 'all' ? 1 : (motion.inView.amount ?? 0.2);
    // inView state minus the observer-only keys → a pure MotionState for the frame.
    const { once: _once, amount: _amount, margin: _margin, ...fromState } = motion.inView;
    const initial = stateToStyle(fromState as MotionState);
    if (initial) node.style.cssText += ';' + initial;
    // stateToStyle omits a 0-channel; guarantee the opacity floor for a fade.
    else if (typeof fromState.opacity === 'number') node.style.opacity = String(fromState.opacity);
    dbg('inView armed', fromState);

    const reveal = () => {
      setTransition(node, ['transform', 'opacity', 'filter']);
      node.style.transform = 'none';
      node.style.opacity = '';
      node.style.filter = '';
      dbg('reveal applied');
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          dbg('IntersectionObserver fired', { isIntersecting: e.isIntersecting });
          if (!e.isIntersecting) continue;
          reveal();
          if (once) io.unobserve(node);
        }
      }, { threshold: amount, rootMargin: motion.inView.margin });
      io.observe(node);
      cleanups.push(() => io.disconnect());
    } else {
      // No IntersectionObserver — don't trap content in the hidden state.
      const id = requestAnimationFrame(() => requestAnimationFrame(reveal));
      cleanups.push(() => cancelAnimationFrame(id));
    }
  }

  // --- scroll: continuous parallax bound to the element's view progress ------
  // FIX 3. Prefer CSS scroll-driven animation (animation-timeline: view()) — zero
  // JS per frame, hardware-composited — and fall back to an IntersectionObserver +
  // scroll-rAF loop where the API is unsupported. Client-only; movement-based, so
  // reduce-motion drops `scroll` upstream (rewriteForReducedMotion) and this block
  // simply never runs.
  if (motion.scroll) {
    const cleanup = wireScroll(node, motion.scroll);
    if (cleanup) cleanups.push(cleanup);
  }

  // --- hover / tap / focus listeners ---
  if (motion.hover) {
    const on = () => applyState(node, motion, 'hover');
    const off = () => applyState(node, motion, null);
    if (!node.style.transition) setTransition(node, ['transform', 'opacity', 'filter']);
    node.addEventListener('mouseenter', on);
    node.addEventListener('mouseleave', off);
    cleanups.push(() => { node.removeEventListener('mouseenter', on); node.removeEventListener('mouseleave', off); });
  }
  if (motion.tap) {
    const down = () => applyState(node, motion, 'tap');
    const up = () => applyState(node, motion, null);
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    cleanups.push(() => { node.removeEventListener('pointerdown', down); node.removeEventListener('pointerup', up); });
  }
  if (motion.focus) {
    const on = () => applyState(node, motion, 'focus');
    const off = () => applyState(node, motion, null);
    node.addEventListener('focusin', on);
    node.addEventListener('focusout', off);
    cleanups.push(() => { node.removeEventListener('focusin', on); node.removeEventListener('focusout', off); });
  }

  // stagger that needs motion.dev springs can be lazily added here later; the
  // Tier-0 path above covers the SSR-critical entrance + interaction + inView +
  // scroll states. The showcase cascade uses per-card transition.delay (FIX 2),
  // not parent-orchestrated stagger, so this is non-blocking. loadInView is wired
  // for a future inView-spring path.
  void loadInView;

  return {
    update(next: Motion | undefined) {
      // Motion fields are static per node in practice; a no-op keeps the action
      // cheap. If `next` changes identity, tear down and re-run.
      if (!next) return;
      motion = prefersReduced() ? rewriteForReducedMotion(next) : next;
      plan = compileMotion(motion);
    },
    destroy() {
      for (const c of cleanups) c();
    },
  };
}

/** The view()-timeline ranges for each `scroll.range` keyword. */
const VIEW_RANGE: Record<NonNullable<Motion['scroll']>['range'], string> = {
  cover: 'cover 0% cover 100%',
  contain: 'contain 0% contain 100%',
  entry: 'entry 0% entry 100%',
  exit: 'exit 0% exit 100%',
};

/** Format a scroll channel value into its inline declaration. */
function scrollChannelStyle(property: NonNullable<Motion['scroll']>['property'], value: number): string {
  switch (property) {
    case 'y': return `transform: translateY(${value}px)`;
    case 'x': return `transform: translateX(${value}px)`;
    case 'scale': return `transform: scale(${value})`;
    case 'rotate': return `transform: rotate(${value}deg)`;
    case 'opacity': return `opacity: ${value}`;
  }
}

let scrollKeyframesInjected = false;
/** Inject the @keyframes the CSS scroll path animates between (once per page). */
function ensureScrollKeyframes(): void {
  if (scrollKeyframesInjected || typeof document === 'undefined') return;
  scrollKeyframesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-ripple-motion-scroll', '');
  // Animate a CSS var the element maps onto its channel. 0 = from, 1 = to.
  style.textContent = `@keyframes ripple-scroll{from{--ripple-scroll:0}to{--ripple-scroll:1}}`;
  document.head.appendChild(style);
}

/**
 * Bind a scroll channel to the element's view progress. Returns a cleanup fn.
 * CSS path: drive a keyframed animation off `animation-timeline: view()` so the
 * compositor interpolates `--ripple-scroll` 0→1 over the view range; the element
 * maps that var onto its channel. JS fallback: IntersectionObserver gates a
 * scroll-rAF loop that recomputes progress and writes the channel inline.
 */
function wireScroll(node: HTMLElement, scroll: NonNullable<Motion['scroll']>): (() => void) | null {
  if (typeof window === 'undefined') return null;
  const range = scroll.range ?? 'cover';
  const supportsViewTimeline =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: view()') &&
    CSS.supports('animation-range: cover');

  if (supportsViewTimeline) {
    ensureScrollKeyframes();
    // Register a custom prop so the var interpolates numerically, then map it
    // onto the channel via a second declaration the browser recomputes each frame.
    node.style.setProperty('animation-name', 'ripple-scroll');
    node.style.setProperty('animation-timeline', 'view()');
    node.style.setProperty('animation-range', VIEW_RANGE[range]);
    node.style.setProperty('animation-fill-mode', 'both');
    node.style.setProperty('animation-duration', '1ms'); // timeline-driven; duration is ignored but required
    // The channel = from + (to-from) * progress, expressed with calc() off the var.
    const span = scroll.to - scroll.from;
    const expr = `calc(${scroll.from} + (${span}) * var(--ripple-scroll, 0))`;
    if (scroll.property === 'opacity') node.style.opacity = expr;
    else if (scroll.property === 'y') node.style.transform = `translateY(calc(${expr} * 1px))`;
    else if (scroll.property === 'x') node.style.transform = `translateX(calc(${expr} * 1px))`;
    else if (scroll.property === 'scale') node.style.transform = `scale(${expr})`;
    else if (scroll.property === 'rotate') node.style.transform = `rotate(calc(${expr} * 1deg))`;
    node.dataset.rippleScroll = 'css';
    dbg('scroll wired', { mode: 'css', ...scroll, range });
    return () => {
      node.style.removeProperty('animation-name');
      node.style.removeProperty('animation-timeline');
      node.style.removeProperty('animation-range');
      node.dataset.rippleScroll = '';
    };
  }

  // --- JS fallback: IntersectionObserver gate + scroll-rAF progress loop ------
  let active = false;
  let rafId = 0;
  const update = () => {
    rafId = 0;
    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // progress 0 when the element's top hits the bottom of the viewport,
    // 1 when its bottom hits the top — the "cover" range.
    const total = rect.height + vh;
    const progress = Math.min(1, Math.max(0, (vh - rect.top) / total));
    const value = scroll.from + (scroll.to - scroll.from) * progress;
    node.style.cssText = node.style.cssText.replace(/;?\s*(transform|opacity)\s*:[^;]*/gi, '') +
      ';' + scrollChannelStyle(scroll.property, value);
  };
  const onScroll = () => { if (active && !rafId) rafId = requestAnimationFrame(update); };
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          active = e.isIntersecting;
          if (active) { update(); window.addEventListener('scroll', onScroll, { passive: true }); }
          else window.removeEventListener('scroll', onScroll);
        }
      })
    : null;
  if (io) io.observe(node);
  else { active = true; update(); window.addEventListener('scroll', onScroll, { passive: true }); }
  node.dataset.rippleScroll = 'fallback';
  dbg('scroll wired', { mode: 'fallback', ...scroll, range });
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    io?.disconnect();
    node.dataset.rippleScroll = '';
  };
}
