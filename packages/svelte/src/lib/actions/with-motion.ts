// src/lib/actions/with-motion.ts
// @file actions/with-motion.ts
// @description The one motion application point. Applied via use:withMotion in
//   NodeRenderer's widget branch. Client-only by nature (Svelte actions never
//   run on the server), so SSR renders the resting frame and this animates on
//   hydrate — no FOUC. Reads prefers-reduced-motion and rewrites accordingly.
//   Tier 0 = CSS transition; Tier 1 = motion.dev via the lazy loader.
// @created 2026-05-30 — RFC 12 animation primitive.
// @changes
//   - 2026-05-30 (PR #45 motion degrade-to-visible fix): motion ALWAYS degrades to
//     VISIBLE, never invisible. ROOT CAUSE: a spring-preset `enter` (e.g. the
//     /showcase/marketing hero, `{opacity:0,y:24}` + `snappy`) was routed to Tier 1
//     and asked motion.dev to spring toward `{opacity:1, transform:'none'}`.
//     motion.dev cannot spring-interpolate the `transform:'none'` keyword: it
//     collapsed the box to `matrix(0,0,0,0,0,0)` (opacity reached 1 but the element
//     became a zero-size, invisible box) and never recovered — a tall empty hero gap.
//     FIX: (a) `enter` now runs on the reliable Tier-0 CSS transition BY DEFAULT
//     (CSS interpolates `transform:'none'` cleanly and can never fail to load); a
//     spring preset is approximated with a spring-like CSS easing via
//     springToCssTiming. (b) Added `revealToRest` — the single canonical
//     degrade-to-visible reveal — and `safeTier1Reveal`, a belt-and-suspenders
//     wrapper that lands the Tier-0 reveal FIRST, then layers motion.dev on top and
//     falls back to Tier-0 if loadAnimate() is null OR animate() throws OR the
//     promise rejects (the `.then` carries a `.catch`). It NEVER `return`s leaving
//     the node hidden, and animates per-channel rest (x:0,y:0,scale:1) — never the
//     broken `transform:'none'` keyword. The Tier-1 enter enhancement is opt-in
//     behind `window.__RIPPLE_TIER1_ENTER__` (off by default). inView reuses the
//     same `revealToRest` so the two reveal paths can't drift.
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
//     * FIX 3 — motion.scroll (continuous parallax) implemented via an
//       IntersectionObserver + scroll-rAF loop that writes transform/opacity from
//       scroll progress every frame. This is the ROBUST PRIMARY PATH (PR #45
//       parallax close-out). The earlier CSS animation-timeline: view() path was
//       removed: it animated an UNREGISTERED `--ripple-scroll` custom property
//       (which interpolates DISCRETELY per spec) so the calc() never produced a
//       moving length — the parallax card sat frozen at transform:none in real
//       Chromium 148 (green jsdom, dead pixels). The rAF loop is deterministic
//       and verified by the Playwright parallax assertion. Client-only.
//     * BONUS — opt-in debug logging gated behind globalThis.__RIPPLE_MOTION_DEBUG__
//       (off by default): action attached, inView armed, IO fired, reveal applied,
//       enter run, scroll wired.
//   - 2026-05-30 (PR #45 animate runtime): export `playMotion(node, motion)` — the
//     one-shot imperative player the `animate` event-action drives. It pulses a
//     target node rest -> peak -> rest where `peak` is the motion's first present
//     interaction frame (enter/hover/tap/focus/inView), reusing the engine channel
//     builder. Prefers the Web Animations API (real keyframe pulse in browsers);
//     falls back to an inline-style transition toggle where WAAPI is absent (so
//     jsdom unit tests still observe the transform mutate). Honors reduced-motion.

import {
		compileMotion,
		stateToStyle,
		rewriteForReducedMotion,
		resolvePreset,
		resolveEasing,
		springToCssTiming,
		loadAnimate,
		loadInView,
		type Motion,
		type MotionState
} from '@ripple-ui/core';

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
  // A spring PRESET (or an explicit spring) is approximated as a CSS duration +
  // spring-like easing via springToCssTiming. This lets the reliable Tier-0 CSS
  // path render a spring-preset entrance without requiring motion.dev (which
  // could not interpolate a `transform:'none'` spring target and collapsed the
  // box to a zero matrix — the invisible-hero bug). Tweens keep their preset ms.
  const physics = motion.transition?.preset ? resolvePreset(motion.transition.preset) : undefined;
  const explicitSpring =
    motion.transition?.type === 'spring' ? motion.transition : undefined;
  const springPhysics =
    physics && physics.type === 'spring' ? physics : explicitSpring;
  const springTiming = springPhysics ? springToCssTiming(springPhysics) : undefined;
  const durationMs = springTiming
    ? springTiming.durationMs
    : physics && physics.type === 'tween'
      ? physics.duration
      : (motion.transition?.duration ?? 300);
  const easing = springTiming ? springTiming.easing : resolveEasing(motion.transition?.easing);
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

  /**
   * The GUARANTEED-VISIBLE reveal (Tier 0). Sets the CSS transition and clears
   * every channel back to its resting/visible state: `transform:'none'`,
   * `opacity:''` (inherit the stylesheet's value, i.e. 1), `filter:''`. This is
   * the single source of truth for "land the element at rest" and the universal
   * degrade target — every path that could otherwise strand the node hidden
   * funnels here. CSS interpolates `transform:'none'` cleanly (no zero matrix),
   * and the engine can never fail to load, so this can't leave the node hidden.
   */
  const revealToRest = (el: HTMLElement) => {
    setTransition(el, ['transform', 'opacity', 'filter']);
    el.style.transform = 'none';
    el.style.opacity = '';
    el.style.filter = '';
  };

  /**
   * Belt-and-suspenders Tier-1 reveal. Attempts a motion.dev animation, but is
   * SAFE BY CONSTRUCTION: it FIRST lands the element at rest via the Tier-0 CSS
   * reveal (so it is visible no matter what), then layers motion.dev on top as a
   * progressive enhancement. If `loadAnimate()` resolves null, or `animate()`
   * throws, or the promise rejects, the CSS reveal has already run — the node is
   * visible. It NEVER `return`s leaving the node hidden, and the `.then` carries a
   * `.catch`. This is the canonical wrapper for ANY future Tier-1 reveal path;
   * `loadAnimate` must only ever be reached through a guard like this one.
   *
   * It is intentionally NOT on the default enter path (enter is pure Tier-0 — see
   * below). It is gated behind an opt-in runtime flag so the spring-enhanced JS
   * path can be A/B'd without risking the invisible-hero regression class.
   */
  const safeTier1Reveal = (el: HTMLElement) => {
    // Guaranteed-visible floor FIRST — CSS lands the element at rest regardless
    // of whether motion.dev loads or the animate call succeeds.
    revealToRest(el);
    loadAnimate()
      .then((animate) => {
        if (!animate) {
          // Engine unavailable — the CSS reveal above already made it visible.
          dbg('safeTier1Reveal: engine null, kept Tier-0 reveal');
          revealToRest(el);
          return;
        }
        try {
          const opts = springPhysics
            ? { type: 'spring', stiffness: springPhysics.stiffness, damping: springPhysics.damping, delay: delaySeconds }
            : { duration: durationMs / 1000, delay: delaySeconds };
          // Animate to the per-channel rest values, NEVER the `transform:'none'`
          // keyword (motion.dev cannot spring-interpolate it — it collapses the
          // box to a zero matrix). 0 px/scale 1 are the explicit rest targets.
          animate(el, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }, opts);
        } catch (err) {
          dbg('safeTier1Reveal: animate threw, fell back to Tier-0', err);
          revealToRest(el);
        }
      })
      .catch((err) => {
        // Import hiccup / rejected promise — degrade to the visible Tier-0 reveal.
        dbg('safeTier1Reveal: loadAnimate rejected, fell back to Tier-0', err);
        revealToRest(el);
      });
  };

  // --- enter: paint initial frame, then animate to resting on next frame ---
  // DEGRADE-TO-VISIBLE GUARANTEE: an entered element ALWAYS ends in its resting
  // (visible) state. A declarative entrance (fade / rise / scale to rest) is a
  // Tier-0 CSS job — CSS interpolates `transform:'none'` cleanly and can never
  // fail to load. So enter runs on the reliable Tier-0 path BY DEFAULT, even for
  // a spring preset (its physics are approximated as a spring-like CSS easing via
  // springToCssTiming above). This replaces the old Tier-1 motion.dev enter,
  // which could not spring-interpolate `transform:'none'` and collapsed the box
  // to `matrix(0,0,0,0,0,0)` — opacity reached 1 but the element was a zero-size
  // (invisible) box forever.
  //
  // The Tier-1 motion.dev spring is available as an OPT-IN enhancement behind
  // `window.__RIPPLE_TIER1_ENTER__` (off by default), and even then it runs
  // through safeTier1Reveal, which lands the Tier-0 reveal first — so it can
  // never reintroduce the invisible hero. The default path is the bulletproof one.
  if (motion.enter) {
    node.style.cssText += ';' + plan.initialStyle;
    const tier1EnterOptIn =
      plan.tier === 1 && !!(globalThis as Record<string, unknown>).__RIPPLE_TIER1_ENTER__;
    const runEnter = () => {
      dbg('enter run');
      if (tier1EnterOptIn) safeTier1Reveal(node);
      else revealToRest(node);
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

    // Reuse the single canonical degrade-to-visible reveal so inView and enter
    // can never drift apart on "land at rest".
    const reveal = () => {
      revealToRest(node);
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

/**
 * Write one scroll-channel value onto the node's inline style WITHOUT clobbering
 * unrelated inline styles. Sets `style.transform` / `style.opacity` directly —
 * the previous implementation rewrote the whole `cssText` with a brittle regex
 * each frame, which both raced other writers and occasionally dropped styles.
 */
function applyScrollChannel(
  node: HTMLElement,
  property: NonNullable<Motion['scroll']>['property'],
  value: number,
): void {
  switch (property) {
    case 'y': node.style.transform = `translateY(${value}px)`; break;
    case 'x': node.style.transform = `translateX(${value}px)`; break;
    case 'scale': node.style.transform = `scale(${value})`; break;
    case 'rotate': node.style.transform = `rotate(${value}deg)`; break;
    case 'opacity': node.style.opacity = String(value); break;
  }
}

/**
 * Bind a scroll channel to the element's view progress. Returns a cleanup fn.
 *
 * IMPLEMENTATION NOTE (FIX 3, PR #45): the IntersectionObserver + scroll-rAF
 * loop is now the ROBUST PRIMARY PATH — it writes `transform: translateY(...)`
 * (or the chosen channel) from scroll progress on every frame, so the element
 * verifiably drifts in every browser. The earlier CSS `animation-timeline:
 * view()` path was COMPOSITOR-DRIVEN but INERT in practice: it animated an
 * UNREGISTERED `--ripple-scroll` custom property, which per the CSS spec
 * interpolates DISCRETELY (no smooth 0→1), and the `calc()` that mapped it into
 * `transform` never produced a moving length — the parallax card sat frozen at
 * `transform: none` (confirmed in real Chromium 148 via the Playwright probe).
 * Rather than ship a second, hard-to-unit-test, easy-to-regress CSS path, we use
 * the rAF loop everywhere; the per-element cost for the handful of parallax
 * nodes a page carries is negligible and the behavior is deterministic. The
 * Playwright assertion (transform changes across scroll positions) is the
 * arbiter — it now passes.
 */
function wireScroll(node: HTMLElement, scroll: NonNullable<Motion['scroll']>): (() => void) | null {
  if (typeof window === 'undefined') return null;
  const range = scroll.range ?? 'cover';

  let active = false;
  let rafId = 0;
  const update = () => {
    rafId = 0;
    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // progress 0 when the element's top hits the bottom of the viewport,
    // 1 when its bottom hits the top — the "cover" range. Clamped to [0,1].
    const total = rect.height + vh || 1;
    const progress = Math.min(1, Math.max(0, (vh - rect.top) / total));
    const value = scroll.from + (scroll.to - scroll.from) * progress;
    applyScrollChannel(node, scroll.property, value);
  };
  const onScroll = () => { if (active && !rafId) rafId = requestAnimationFrame(update); };

  // Paint the initial frame immediately so the element starts at its scroll
  // position rather than its resting frame (no first-scroll jump).
  update();

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
  else {
    // No IntersectionObserver — bind the scroll listener unconditionally.
    active = true;
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  node.dataset.rippleScroll = 'raf';
  dbg('scroll wired', { mode: 'raf', ...scroll, range });
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    io?.disconnect();
    node.dataset.rippleScroll = '';
  };
}

// ── imperative one-shot player (the `animate` event-action runtime) ───────────

/** Build a WAAPI keyframe object (transform/opacity/filter) from a MotionState. */
function stateToKeyframe(state: MotionState): Keyframe {
  const transforms: string[] = [];
  if (state.x !== undefined) transforms.push(`translateX(${typeof state.x === 'number' ? state.x + 'px' : state.x})`);
  if (state.y !== undefined) transforms.push(`translateY(${typeof state.y === 'number' ? state.y + 'px' : state.y})`);
  if (typeof state.scale === 'number') transforms.push(`scale(${state.scale})`);
  if (typeof state.rotate === 'number') transforms.push(`rotate(${state.rotate}deg)`);
  const frame: Keyframe = {};
  if (transforms.length) frame.transform = transforms.join(' ');
  if (typeof state.opacity === 'number') frame.opacity = String(state.opacity);
  if (typeof state.blur === 'number') frame.filter = `blur(${state.blur}px)`;
  return frame;
}

/**
 * The single "peak" frame an imperative `animate` pulses toward. We take the
 * FIRST present interaction frame in a fixed precedence so an author can write
 * the gesture under whichever key reads best (`enter`, then `hover`, `tap`,
 * `focus`, finally the inView from-state). Returns null when none carry channels.
 */
function peakState(m: Motion): MotionState | null {
  const candidates: Array<MotionState | undefined> = [m.enter, m.hover, m.tap, m.focus, m.inView];
  for (const c of candidates) {
    if (c && Object.keys(stateToKeyframe(c)).length > 0) return c;
  }
  return null;
}

/**
 * Imperative one-shot animation — the runtime behind the `animate` event-action.
 * Pulses `node` rest -> peak -> rest, where `peak` is the motion's first present
 * interaction frame. Client-only (no-op without a DOM). Honors reduced-motion by
 * dropping transforms to an opacity-only blink. Returns true if it played, false
 * if there was nothing to animate (lets the caller fall back to host handling).
 *
 * Prefers the Web Animations API for a real, composited keyframe pulse. Where
 * `element.animate` is unavailable (older engine / jsdom unit env) it toggles the
 * peak frame onto the inline style with a CSS transition and clears it after the
 * duration — enough for a unit test to observe the transform actually mutate.
 */
export function playMotion(node: HTMLElement, raw: Motion | undefined): boolean {
  if (!node || !raw || typeof window === 'undefined') return false;
  const motion = prefersReduced() ? rewriteForReducedMotion(raw) : raw;
  const peak = peakState(motion);
  if (!peak) {
    dbg('playMotion: no peak frame', motion);
    return false;
  }
  const keyframe = stateToKeyframe(peak);

  // Timing from the transition preset / explicit values (same resolution the
  // declarative path uses). Springs collapse to their token duration here — a
  // one-shot pulse does not need full spring physics to read as alive.
  const physics = motion.transition?.preset ? resolvePreset(motion.transition.preset) : undefined;
  const durationMs =
    physics && physics.type === 'tween'
      ? physics.duration
      : motion.transition?.duration ?? 320;
  const easing = resolveEasing(motion.transition?.easing);
  const delayMs = (motion.transition?.delay ?? 0) * 1000;
  // A pulse is out-and-back, so each leg gets half the budget (min floor so it
  // is always visible). The total stays close to the author's intent.
  const legMs = Math.max(120, durationMs);

  dbg('playMotion: peak', { peak, durationMs, delayMs });

  if (typeof node.animate === 'function') {
    node.animate(
      [
        { transform: 'none', opacity: '1', filter: 'none' },
        { ...keyframe, offset: 0.5 },
        { transform: 'none', opacity: '1', filter: 'none' },
      ],
      { duration: legMs * 2, delay: delayMs, easing, fill: 'none' },
    );
    return true;
  }

  // --- WAAPI-less fallback: toggle the peak frame on, then clear it -----------
  const prevTransition = node.style.transition;
  node.style.transition = `transform ${legMs}ms ${easing}, opacity ${legMs}ms ${easing}, filter ${legMs}ms ${easing}`;
  if (keyframe.transform) node.style.transform = String(keyframe.transform);
  if (keyframe.opacity) node.style.opacity = String(keyframe.opacity);
  if (keyframe.filter) node.style.filter = String(keyframe.filter);
  const clear = () => {
    node.style.transform = 'none';
    node.style.opacity = '';
    node.style.filter = '';
    node.style.transition = prevTransition;
  };
  if (typeof setTimeout === 'function') setTimeout(clear, legMs);
  return true;
}
