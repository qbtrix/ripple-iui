// src/lib/widgets/layout/Separator.test.ts
// Created 2026-06-08 — locks in the divider breathing-room rhythm: a horizontal
// separator gets a default vertical margin via a zero-specificity scoped rule,
// keyed off wrapper data-attributes, and a spec-supplied margin opts out of the
// default. jsdom does not apply <style> blocks, so we assert on the structural
// markers that DRIVE the scoped CSS (data-orientation / data-explicit-margin)
// rather than computed margins.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Separator from './Separator.svelte';

describe('Separator', () => {
  it('wraps a horizontal divider and marks it for default rhythm', () => {
    const { container } = render(Separator, { props: {} });
    const wrapper = container.querySelector('.ripple-separator') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.getAttribute('data-orientation')).toBe('horizontal');
    // No explicit margin -> the default-rhythm opt-out attribute is absent.
    expect(wrapper.hasAttribute('data-explicit-margin')).toBe(false);
    // The underlying bits-ui separator still renders.
    expect(wrapper.querySelector('[data-slot="separator"]')).not.toBeNull();
  });

  it('marks vertical orientation so block margin is not applied', () => {
    const { container } = render(Separator, { props: { orientation: 'vertical' } });
    const wrapper = container.querySelector('.ripple-separator') as HTMLElement;
    expect(wrapper.getAttribute('data-orientation')).toBe('vertical');
  });

  it('opts out of the default rhythm when the spec passes an explicit margin', () => {
    const { container } = render(Separator, { props: { class: 'my-8' } });
    const wrapper = container.querySelector('.ripple-separator') as HTMLElement;
    expect(wrapper.getAttribute('data-explicit-margin')).toBe('true');
  });

  it('treats a zero-margin override as explicit (full spec control)', () => {
    const { container } = render(Separator, { props: { class: 'm-0' } });
    const wrapper = container.querySelector('.ripple-separator') as HTMLElement;
    expect(wrapper.getAttribute('data-explicit-margin')).toBe('true');
  });

  it('does not treat a non-margin class as an explicit margin', () => {
    const { container } = render(Separator, { props: { class: 'opacity-50' } });
    const wrapper = container.querySelector('.ripple-separator') as HTMLElement;
    expect(wrapper.hasAttribute('data-explicit-margin')).toBe(false);
  });
});
