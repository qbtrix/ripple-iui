// src/lib/motion/moving-indicator.ts
// @file motion/moving-indicator.ts
// @description GENERIC moving-indicator (shared-layout) primitive — "a highlight
//   springs to the active item among its siblings." A Svelte action applied to
//   the HIGHLIGHT element (the box that travels). Given a container, a way to
//   enumerate the sibling items, and which sibling is ACTIVE, it measures the
//   active item's box and glides the highlight there by writing inline
//   top/left/width/height + a CSS transition timed by an FF spring token (via
//   `ffTokenToCssTiming`). The same primitive drives a tab/segmented underline,
//   a menu rail highlight, a checkbox-group hover background, etc. — every widget
//   where one indicator chases the active sibling.
//
//   Why this shape (an action on the highlight, not a component):
//     - The highlight is one absolutely-positioned box the CONSUMER already owns
//       and styles (color, radius, z). The primitive only owns POSITION + TIMING,
//       so it stays presentation-agnostic and composes with any look.
//     - Actions are client-only by construction (they never run on the server),
//       so SSR paints the resting frame and the glide arms on hydrate — no FOUC,
//       and (critically) NO top-level animation-engine import, so `lint:anim`
//       stays green. The whole motion is a positional CSS transition.
//
//   API — `use:movingIndicator={options}` on the highlight element:
//     • container:   HTMLElement | (() => HTMLElement | null)
//         The element whose layout box the item measurements are relative to.
//         The highlight is `position:absolute` inside this (its offsetParent).
//     • items:       () => ArrayLike<HTMLElement | null>
//         Enumerate the candidate sibling elements IN ORDER. Re-read each update
//         so list changes are picked up. Nulls are skipped (unmounted slots).
//     • active:      number | null | ((items, ...) => number | null) | predicate
//         WHICH sibling is active. Three accepted forms so a widget can source
//         "active" from selection OR hover OR focus without adapter glue:
//           - a number index (or null for "no active → hide"),
//           - an (items) => index | null resolver,
//           - { match: (el, index) => boolean } predicate — first match wins.
//         This is the seam that makes the primitive generic across "selected"
//         and "hovered" sources (the checkbox-group sources hover; a segmented
//         control sources selection).
//     • token?:      { duration; bounce }  (default FF `fast` = 80ms, no bounce)
//         The FF spring token the glide is timed by. Mapped to a CSS transition
//         (duration + spring-like easing) via `ffTokenToCssTiming`, so the glide
//         honors FF's signature sub-100ms snap rather than a generic 300ms ease.
//     • axis?:       'y' | 'x' | 'both'   (default 'both')
//         Which box dimensions glide. 'both' animates top/left/width/height (the
//         checkbox-group case — items differ in height AND width). 'x' animates
//         left/width only (a horizontal segmented underline), 'y' top/height.
//     • inset?:      number   (default 0)
//         Grow (positive) / shrink (negative) the highlight box uniformly, e.g.
//         a focus ring sits `inset: -2` (2px outside). Applied to all 4 edges.
//     • reducedMotion?: boolean
//         When true, the highlight JUMPS (no transition) — honors the user's
//         prefers-reduced-motion. The consumer passes its own resolved value so
//         the primitive stays free of a media-query dependency (SSR/jsdom-safe).
//     • onMeasure?:  (rects) => void
//         Optional escape hatch — fires after each (re)measure with the measured
//         item rects, for a consumer that also wants the geometry (e.g. to draw
//         MERGED runs, like the checkbox-group). Keeps the measure loop single.
//
//   Measurement is transform-immune by design: it reads `offsetTop/offsetLeft/
//   offsetWidth/offsetHeight` (layout box relative to the offsetParent), NOT
//   getBoundingClientRect — so an ancestor `transform: scale()` (a parent enter
//   animation) never warps the indicator's target box. This mirrors FF's own
//   `useProximityHover` measure loop exactly.
//
//   Re-measure triggers: (1) `update()` when the action's options change
//   (active/items churn), (2) a ResizeObserver on the container (reflow,
//   font-load, width change), (3) the first two animation frames after mount
//   (layout settled). Each remeasure re-applies the current active box.
//
//   NOTE on top/left/width/height vs transform: the perf guardrail says "animate
//   transform/opacity only." Here we animate the positional box ON PURPOSE — the
//   indicator must morph its WIDTH/HEIGHT to each sibling's box (siblings differ
//   in size), and a translate+scale would warp rounded corners and contents. The
//   cost is bounded: a handful of siblings, pointer/selection-driven (never
//   scroll/looped), with `will-change` hinting the compositor. This is the same
//   deliberate trade FF makes; faithful feel beats the blanket rule here.
//
// @provenance Generalized from Fluid Functionalism's checkbox-group +
//   useProximityHover measure-and-spring-highlight (github.com/mickadesign/
//   fluid-functionalism, MIT). FF springs a motion.div's top/left/width/height
//   between measured item rects; this reproduces the identical glide as a CSS
//   transition on those same properties, timed by the FF token via
//   `ffTokenToCssTiming`. Made reusable so any widget can mount the pattern.
// @created 2026-05-30 — RFC 12: generic moving-indicator (shared-layout) primitive.

import { ffTokenToCssTiming } from '@ripple-ui/core';
import { FF_SPRING_TOKENS } from '@ripple-ui/core';

/** A measured layout box, transform-immune (offset* space). */
export interface IndicatorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Resolve "which sibling is active" — index, resolver fn, or first-match predicate. */
export type ActiveSource =
  | number
  | null
  | ((items: (HTMLElement | null)[], rects: IndicatorRect[]) => number | null)
  | { match: (el: HTMLElement, index: number) => boolean };

export interface MovingIndicatorOptions {
  /** The element the items + highlight are positioned within (the offsetParent). */
  container: HTMLElement | (() => HTMLElement | null);
  /** Enumerate the candidate sibling elements, in order. Re-read each update. */
  items: () => ArrayLike<HTMLElement | null>;
  /** Which sibling is active. number | null | resolver | { match } — see file header. */
  active: ActiveSource;
  /** FF spring token timing the glide. Default `fast` (80ms, no bounce). */
  token?: { duration: number; bounce: number };
  /** Which box dimensions glide. Default 'both'. */
  axis?: 'y' | 'x' | 'both';
  /** Grow (+) / shrink (-) the box uniformly on all edges. Default 0. */
  inset?: number;
  /** When true the highlight JUMPS (no transition) — prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Fires after each remeasure with the item rects (consumer escape hatch). */
  onMeasure?: (rects: IndicatorRect[]) => void;
}

/** Measure one element's transform-immune layout box (offset* space). */
function measureRect(el: HTMLElement): IndicatorRect {
  return { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight };
}

/** Resolve the active index from any of the accepted `active` forms. */
function resolveActive(
  active: ActiveSource,
  items: (HTMLElement | null)[],
  rects: IndicatorRect[],
): number | null {
  if (active === null) return null;
  if (typeof active === 'number') return Number.isFinite(active) ? active : null;
  if (typeof active === 'function') {
    const i = active(items, rects);
    return i === null || i === undefined ? null : i;
  }
  // { match } predicate — first matching mounted item wins.
  for (let i = 0; i < items.length; i++) {
    const el = items[i];
    if (el && active.match(el, i)) return i;
  }
  return null;
}

/**
 * Build the CSS `transition` string for the gliding properties. Only the axes
 * that move are listed (so a horizontal underline doesn't transition top/height
 * for nothing). Opacity always transitions on a short fade so show/hide is soft.
 */
function buildTransition(axis: 'y' | 'x' | 'both', durationMs: number, easing: string): string {
  const props: string[] = [];
  if (axis === 'both' || axis === 'y') props.push('top', 'height');
  if (axis === 'both' || axis === 'x') props.push('left', 'width');
  const positional = props.map((p) => `${p} ${durationMs}ms ${easing}`).join(', ');
  // Fade duration tracks the glide but is floored short so show/hide feels crisp.
  const fadeMs = Math.min(durationMs, 120);
  return `${positional}, opacity ${fadeMs}ms ${easing}`;
}

/**
 * Svelte action — mount on the HIGHLIGHT element. Measures the active sibling's
 * box (transform-immune) and glides the highlight there via inline
 * top/left/width/height + an FF-token CSS transition. Hides (opacity 0) when no
 * sibling is active. Re-measures on option change + container resize. Client-only.
 *
 * Returns the Svelte action handle ({ update, destroy }).
 */
export function movingIndicator(node: HTMLElement, options: MovingIndicatorOptions) {
  let opts = options;
  let resizeObserver: ResizeObserver | null = null;
  let observedContainer: HTMLElement | null = null;
  let mountFrame = 0;

  // The highlight is positioned by us — guarantee the layout contract even if the
  // consumer forgot. (Absolute inside the measured container; we drive position.)
  if (!node.style.position) node.style.position = 'absolute';
  node.style.willChange = 'top, left, width, height';
  // Start hidden until the first measure resolves an active box — no flash at 0,0.
  node.style.opacity = '0';

  const getContainer = (): HTMLElement | null =>
    typeof opts.container === 'function' ? opts.container() : opts.container;

  /** Read items, measure all, resolve active, and apply the active box to `node`. */
  const apply = () => {
    const container = getContainer();
    if (!container) return;
    const raw = opts.items();
    const items: (HTMLElement | null)[] = [];
    for (let i = 0; i < raw.length; i++) items[i] = raw[i] ?? null;

    const rects: IndicatorRect[] = [];
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (el) rects[i] = measureRect(el);
    }
    opts.onMeasure?.(rects);

    const activeIndex = resolveActive(opts.active, items, rects);
    const rect = activeIndex === null ? undefined : rects[activeIndex];

    const token = opts.token ?? FF_SPRING_TOKENS.fast;
    const { durationMs, easing } = ffTokenToCssTiming(token);
    const axis = opts.axis ?? 'both';
    const inset = opts.inset ?? 0;

    // Reduced motion → no positional transition (the box JUMPS), opacity still
    // fades softly so show/hide isn't a hard pop.
    node.style.transition = opts.reducedMotion
      ? `opacity ${Math.min(durationMs, 120)}ms ${easing}`
      : buildTransition(axis, durationMs, easing);

    if (!rect) {
      // No active sibling → hide. Leave the last position so it fades in place
      // rather than snapping to 0,0 (which would streak across on re-show).
      node.style.opacity = '0';
      return;
    }

    node.style.top = `${rect.top - inset}px`;
    node.style.left = `${rect.left - inset}px`;
    node.style.width = `${rect.width + inset * 2}px`;
    node.style.height = `${rect.height + inset * 2}px`;
    node.style.opacity = '1';
  };

  /** (Re)bind the ResizeObserver to the current container so reflow re-measures. */
  const observe = () => {
    const container = getContainer();
    if (container === observedContainer) return;
    if (resizeObserver && observedContainer) resizeObserver.unobserve(observedContainer);
    observedContainer = container;
    if (!container) return;
    if (typeof ResizeObserver !== 'undefined') {
      if (!resizeObserver) resizeObserver = new ResizeObserver(() => apply());
      resizeObserver.observe(container);
    }
  };

  observe();
  // Apply once now (layout may already be settled), then again across the next
  // two frames — the first paint after mount can report 0-boxes before the
  // container has laid out its children. Cheap and bullet-proofs the first glide.
  apply();
  mountFrame = requestAnimationFrame(() => requestAnimationFrame(apply));

  return {
    update(next: MovingIndicatorOptions) {
      opts = next;
      observe();
      apply();
    },
    destroy() {
      if (mountFrame) cancelAnimationFrame(mountFrame);
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = null;
      observedContainer = null;
    },
  };
}
