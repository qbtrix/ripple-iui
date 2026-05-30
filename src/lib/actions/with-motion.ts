// src/lib/actions/with-motion.ts
// @file actions/with-motion.ts
// @description The one motion application point. Applied via use:withMotion in
//   NodeRenderer's widget branch. Client-only by nature (Svelte actions never
//   run on the server), so SSR renders the resting frame and this animates on
//   hydrate — no FOUC. Reads prefers-reduced-motion and rewrites accordingly.
//   Tier 0 = CSS transition; Tier 1 = motion.dev via the lazy loader.
// @created 2026-05-30 — RFC 12 animation primitive.

import type { Motion } from '../schema/motion.js';
import { compileMotion } from '../motion/engine.js';
import { rewriteForReducedMotion } from '../motion/reduce-motion.js';
import { resolvePreset, resolveEasing } from '../motion/presets.js';
import { loadAnimate, loadInView } from '../motion/load-tier1.js';

function prefersReduced(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // --- transition timing for Tier 0 (CSS) ---
  const physics = motion.transition?.preset ? resolvePreset(motion.transition.preset) : undefined;
  const durationMs = physics && physics.type === 'tween' ? physics.duration : (motion.transition?.duration ?? 300);
  const easing = resolveEasing(motion.transition?.easing);

  // --- enter: paint initial frame, then animate to resting on next frame ---
  if (motion.enter) {
    node.style.cssText += ';' + plan.initialStyle;
    const runEnter = () => {
      if (plan.tier === 1) {
        loadAnimate().then((animate) => {
          if (!animate) return;
          const spring = physics && physics.type === 'spring' ? physics : (motion.transition?.type === 'spring' ? motion.transition : undefined);
          animate(node, { opacity: 1, transform: 'none' }, spring ? { type: 'spring', stiffness: (spring as { stiffness?: number }).stiffness, damping: (spring as { damping?: number }).damping } : { duration: durationMs / 1000 });
        });
      } else {
        node.style.transition = `transform ${durationMs}ms ${easing}, opacity ${durationMs}ms ${easing}, filter ${durationMs}ms ${easing}`;
        node.style.transform = 'none';
        node.style.opacity = '';
        node.style.filter = '';
      }
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(runEnter));
    cleanups.push(() => cancelAnimationFrame(id));
  }

  // --- inView: native IntersectionObserver, SSR-safe (client-only action) ---
  if (motion.inView && typeof IntersectionObserver !== 'undefined') {
    const once = motion.inView.once ?? true;
    const amount = motion.inView.amount === 'all' ? 1 : (motion.inView.amount ?? 0.2);
    node.style.opacity = typeof motion.inView.opacity === 'number' ? String(motion.inView.opacity) : '0';
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        node.style.transition = `transform ${durationMs}ms ${easing}, opacity ${durationMs}ms ${easing}`;
        node.style.transform = 'none';
        node.style.opacity = '';
        if (once) io.unobserve(node);
      }
    }, { threshold: amount, rootMargin: motion.inView.margin });
    io.observe(node);
    cleanups.push(() => io.disconnect());
  }

  // --- hover / tap / focus listeners ---
  if (motion.hover) {
    const on = () => applyState(node, motion, 'hover');
    const off = () => applyState(node, motion, null);
    node.style.transition ||= `transform ${durationMs}ms ${easing}, opacity ${durationMs}ms ${easing}`;
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

  // inView/stagger/scroll that need motion.dev springs can be lazily added here
  // later; the Tier-0 path above covers the SSR-critical entrance + interaction
  // states. loadInView is wired for a future inView-spring path.
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
