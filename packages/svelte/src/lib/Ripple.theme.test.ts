// src/lib/Ripple.theme.test.ts
// @description Asserts the white-label theme-applier reaches the DOM: spec.theme
//   color/radius/font tokens are emitted as CSS custom properties on the
//   ripple-root, and a theme-less spec leaves the root untouched.
// @created 2026-05-30 — RFC 12 theme-applier (interface-contract item 5).
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

describe('Ripple applies spec.theme to the DOM', () => {
  it('emits color + radius vars onto the ripple-root style', () => {
    const { container } = render(Ripple, {
      props: { spec: { ui: { type: 'text', props: { text: 'hi' } }, theme: { colors: { primary: '#1d4ed8' }, radius: '0.75rem' } } },
    });
    const root = container.querySelector('.ripple-root') as HTMLElement;
    expect(root.style.getPropertyValue('--primary')).toBe('#1d4ed8');
    expect(root.style.getPropertyValue('--radius')).toBe('0.75rem');
  });

  it('emits font vars when fonts are set', () => {
    const { container } = render(Ripple, {
      props: { spec: { ui: { type: 'text', props: { text: 'hi' } }, theme: { fonts: { heading: 'Fraunces' } } } },
    });
    const root = container.querySelector('.ripple-root') as HTMLElement;
    expect(root.style.getPropertyValue('--ripple-font-heading')).toBe('Fraunces');
  });

  it('a spec with no theme leaves the root style untouched (no theme vars)', () => {
    const { container } = render(Ripple, { props: { spec: { ui: { type: 'text', props: { text: 'hi' } } } } });
    const root = container.querySelector('.ripple-root') as HTMLElement;
    expect(root.style.getPropertyValue('--primary')).toBe('');
  });
});
