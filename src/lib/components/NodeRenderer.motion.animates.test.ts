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
});
