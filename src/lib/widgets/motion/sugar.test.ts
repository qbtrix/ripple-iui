// src/lib/widgets/motion/sugar.test.ts
// @file widgets/motion/sugar.test.ts
// @description Tests the reveal + parallax sugar widgets: they register in the
//   catalog, render their children, and reveal renders a [data-ripple-motion]
//   marker (it applies withMotion to itself, independent of node.motion).
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.11 (sugar widgets).
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
});
