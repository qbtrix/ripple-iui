// src/lib/components/NodeRenderer.motion.test.ts
// @file components/NodeRenderer.motion.test.ts
// @description Client-side (jsdom) motion-wiring tests for NodeRenderer: a
//   motion field adds a [data-ripple-motion] wrapper, a motion-free spec adds
//   none (no regression), and reduced-motion drops the translate on the client.
//   The load-bearing SSR final-frame assertion lives in the sibling
//   NodeRenderer.motion.ssr.test.ts (runs under server resolve conditions —
//   svelte/server cannot drive the browser-built component this project pins).
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.8.
import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import type { UINode } from '$lib/schema/ui-spec.js';

function renderSpec(ui: UINode) {
  return render(Ripple, { props: { spec: { ui } } });
}

describe('NodeRenderer motion wiring', () => {
  it('wraps a widget that has a motion field (motion marker present)', () => {
    const { container } = renderSpec({
      type: 'hero',
      props: { title: 'Hi' },
      motion: { enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } },
    });
    expect(container.querySelector('[data-ripple-motion]')).not.toBeNull();
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
