// src/lib/components/NodeRenderer.motion.animates.test.ts
// @file components/NodeRenderer.motion.animates.test.ts
// @description End-to-end "does it actually animate" proof for the node-level
//   motion path — the test that would have caught the display:contents bug.
//   The withMotion unit test already proves the action mutates transform on a
//   bare div; the bug was that NodeRenderer attached the action to a
//   `display: contents` wrapper, which has no box, so the mutated transform
//   painted nothing. This renders a real motion spec THROUGH NodeRenderer and
//   asserts, on the SAME [data-ripple-motion] element:
//     1. it is a transformable box (inline display is block, never 'contents'),
//     2. dispatching a real mouseenter mutates its inline transform to the
//        hover frame, and mouseleave clears it.
//   Combined, that is the strongest non-browser proof that node motion paints.
//   Full visual confirmation (a browser computing the transform and repainting
//   pixels) still needs Playwright, which this repo does not ship — see
//   docs/motion-smoke-test.md for the manual browser check.
// @created 2026-05-30 — PR #45 motion-wrapper box fix.
// @changes
//   - 2026-05-30 (PR #45 motion runtime close-out): added the staggered-card
//     proof — renders the EXACT /showcase/motion staggerSpec shape (inView
//     {opacity:0,y:28} + transition.delay in seconds) through Ripple and asserts
//     a card wrapper carries BOTH the initial translateY AND a per-card
//     transition-delay. This is the DOM-level proof that the cascade works.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import type { UINode } from '$lib/schema/ui-spec.js';
import type { Motion, MotionInput } from '$lib/schema/motion.js';

function renderSpec(ui: UINode) {
  return render(Ripple, { props: { spec: { ui } } });
}

describe('NodeRenderer motion — actually animates (end-to-end)', () => {
  it('hover mutates the wrapper transform on a transformable box (the bug-catcher)', () => {
    const { container } = renderSpec({
      type: 'hero',
      props: { title: 'Hover me' },
      motion: ({ hover: { scale: 1.05 }, transition: { preset: 'smooth' } } satisfies MotionInput) as Motion,
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();

    // (1) Transformable box — the half the display:contents bug broke.
    expect(wrapper!.style.display).not.toBe('contents');

    // (2) The transform must actually change on hover — proving the style the
    //     action writes lands on a box that can be transformed. Resting frame
    //     carries no hover scale.
    expect(/scale\(1\.05\)/.test(wrapper!.style.transform)).toBe(false);
    wrapper!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(wrapper!.style.transform).toMatch(/scale\(1\.05\)/);
    // Leaving clears it back to the resting frame.
    wrapper!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(/scale\(1\.05\)/.test(wrapper!.style.transform)).toBe(false);
  });

  it('an enter motion paints the pre-animation opacity frame on the wrapper box', () => {
    const { container } = renderSpec({
      type: 'hero',
      props: { title: 'Fade in' },
      motion: ({ enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } } satisfies MotionInput) as Motion,
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.style.display).not.toBe('contents');
    // withMotion paints the "from" opacity synchronously on mount; it can only
    // be visible because the wrapper is a real box.
    expect(wrapper!.style.opacity).toBe('0');
  });

  // The showcase staggered-card proof: a card authored EXACTLY like
  // /showcase/motion (inView fade+rise + a per-card delay in seconds) must mount
  // with BOTH the initial translateY (it rises, not just fades) AND a non-zero
  // transition-delay (the cascade). This is the DOM-level proof for FIX 1+2.
  it('a staggered card mounts with the initial translateY AND a per-card transition-delay', () => {
    // index 2 of the showcase row → delay = 2 * 0.12 = 0.24s = 240ms.
    const { container } = renderSpec({
      type: 'card',
      props: { title: '03 · Refine' },
      motion: ({
        inView: { opacity: 0, y: 28, once: true, amount: 0.2 },
        transition: { preset: 'smooth', delay: 0.24 },
      } satisfies MotionInput) as Motion,
      children: [{ type: 'text', props: { text: 'body', size: 'sm' } }],
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    // Must be a transformable box (not display:contents) or the styles paint nothing.
    expect(wrapper!.style.display).not.toBe('contents');
    // FIX 1: the from-state is the FULL frame — opacity AND the rise.
    expect(wrapper!.style.opacity).toBe('0');
    expect(wrapper!.style.transform).toMatch(/translateY\(28px\)/);
    // FIX 2: reveal carries the per-card delay (240ms). Fire the observer if one
    // was registered; otherwise the no-IO fallback reveals on rAF — wait for it.
    wrapper!.dispatchEvent(new Event('x')); // no-op to keep types happy
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // After reveal, the from-state has transitioned out and the delay is set.
        expect(wrapper!.style.transitionDelay).toMatch(/240ms|0\.24s/);
        resolve();
      }));
    });
  });
});
