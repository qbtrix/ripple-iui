// src/lib/widgets/motion/sugar.test.ts
// @file widgets/motion/sugar.test.ts
// @description Tests the reveal + parallax sugar widgets: they register in the
//   catalog, render their children, and reveal renders a [data-ripple-motion]
//   marker (it applies withMotion to itself, independent of node.motion).
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.11 (sugar widgets).
// @changes
//   - 2026-05-30 (PR #45 motion runtime close-out): parallax now wires the
//     motion.scroll runtime (FIX 3) instead of rendering inert — assert the
//     rendered wrapper is tagged scroll-wired.
//   - 2026-05-30 (PR #45 parallax close-out): the scroll runtime is now a single
//     robust IO/scroll-rAF path tagged 'raf' (the inert CSS view-timeline path
//     was removed) — assertion updated to expect 'raf'.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { getWidgetTypes } from '$lib/widgets/index.js';

describe('motion sugar widgets', () => {
  it('reveal is registered in the catalog', () => {
    expect(getWidgetTypes()).toContain('reveal');
  });
  it('parallax is registered in the catalog', () => {
    expect(getWidgetTypes()).toContain('parallax');
  });
  it('reveal renders its children and a motion marker', () => {
    const { container, getByText } = render(Ripple, {
      props: { spec: { ui: { type: 'reveal', children: [{ type: 'text', props: { text: 'revealed body' } }] } } },
    });
    expect(getByText('revealed body')).toBeInTheDocument();
    expect(container.querySelector('[data-ripple-motion]')).not.toBeNull();
  });
  it('parallax renders its children', () => {
    const { getByText } = render(Ripple, {
      props: { spec: { ui: { type: 'parallax', children: [{ type: 'text', props: { text: 'floats' } }] } } },
    });
    expect(getByText('floats')).toBeInTheDocument();
  });

  it('parallax wires the scroll runtime (no longer inert)', () => {
    // FIX 3: the parallax sugar desugars to a motion.scroll; the withMotion
    // action wires the robust IO/scroll-rAF loop and tags the wrapper 'raf'.
    // Before FIX 3 there was no scroll branch at all; the inert CSS view-timeline
    // path that briefly followed was removed in the parallax close-out.
    const { container } = render(Ripple, {
      props: { spec: { ui: { type: 'parallax', props: { distance: 50 }, children: [{ type: 'text', props: { text: 'drifts' } }] } } },
    });
    const wrapper = container.querySelector('[data-ripple-motion]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.dataset.rippleScroll).toBe('raf');
  });
});
