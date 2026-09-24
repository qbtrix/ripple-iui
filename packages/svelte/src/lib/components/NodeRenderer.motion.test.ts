// src/lib/components/NodeRenderer.motion.test.ts
// @file components/NodeRenderer.motion.test.ts
// @description Client-side (jsdom) motion-wiring tests for NodeRenderer: a
//   motion field adds a [data-ripple-motion] wrapper, a motion-free spec adds
//   none (no regression), and reduced-motion drops the translate on the client.
//   The load-bearing SSR final-frame assertion lives in the sibling
//   NodeRenderer.motion.ssr.test.ts (runs under server resolve conditions —
//   svelte/server cannot drive the browser-built component this project pins).
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.8.
// @changes
//   - 2026-05-30 (Task 1.13 close-out): the enter-only literal is authored as
//     MotionInput (reduceMotion supplied by its schema default) and adapted to
//     the node's parsed Motion field via `satisfies`, so it type-checks without
//     hand-writing the runtime-defaulted reduceMotion.
//   - 2026-05-30 (motion-wrapper box fix, PR #45): added a regression test that
//     asserts the [data-ripple-motion] wrapper is a TRANSFORMABLE box — i.e. it
//     is NOT `display: contents`. `display: contents` generates no box, so the
//     transform/opacity/filter that withMotion sets on the wrapper have zero
//     visual effect (the node-level motion ran but never animated). The wrapper
//     must be a layout box (block), matching the working reveal/parallax sugar
//     widgets. Was RED before the NodeRenderer fix, GREEN after.
import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import type { UINode } from '@ripple-ui/core';
import type { Motion, MotionInput } from '@ripple-ui/core';

function renderSpec(ui: UINode) {
  return render(Ripple, { props: { spec: { ui } } });
}

describe('NodeRenderer motion wiring', () => {
  it('wraps a widget that has a motion field (motion marker present)', () => {
    const { container } = renderSpec({
      type: 'hero',
      props: { title: 'Hi' },
      motion: ({ enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } } satisfies MotionInput) as Motion,
    });
    expect(container.querySelector('[data-ripple-motion]')).not.toBeNull();
  });

  it('motion wrapper is a TRANSFORMABLE box — it is NOT display:contents', () => {
    // Regression for the silent no-animation bug: a `display: contents` wrapper
    // generates no box, so the transform/opacity/filter withMotion writes onto
    // it have ZERO visual effect. The wrapper must be a real layout box so the
    // transition actually paints. Mirrors the reveal/parallax sugar widgets,
    // which apply use:withMotion to a `display: block` div and DO animate.
    const { container } = renderSpec({
      type: 'hero',
      props: { title: 'Hi' },
      motion: ({ hover: { scale: 1.05 }, transition: { preset: 'smooth' } } satisfies MotionInput) as Motion,
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    // The marker must survive the fix.
    expect(wrapper!.dataset.rippleMotion).not.toBeUndefined();
    // The load-bearing assertion: no `display: contents`. jsdom reports the
    // inline display via style.display.
    expect(wrapper!.style.display).not.toBe('contents');
  });

  it('does NOT add a motion wrapper when there is no motion field (no regression)', () => {
    const { container } = renderSpec({ type: 'hero', props: { title: 'Hi' } });
    expect(container.querySelector('[data-ripple-motion]')).toBeNull();
  });

  it('reduced-motion: a moving enter renders without translate even on the client', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; },
    }));
    const { container } = renderSpec({
      type: 'hero', props: { title: 'Hi' },
      motion: { enter: { opacity: 0, y: 40 }, reduceMotion: 'cross-fade' },
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.style.transform === '' || !/translate/.test(wrapper!.style.transform)).toBe(true);
    vi.unstubAllGlobals();
  });
});
