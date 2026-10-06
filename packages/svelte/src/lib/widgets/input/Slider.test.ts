// src/lib/widgets/input/Slider.test.ts — the accessible name lands on the role="slider" thumb.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { Slider as UiSlider } from '$lib/components/ui/slider/index.js';
import Slider from './Slider.svelte';

afterEach(cleanup);

describe('Slider accessible name', () => {
  it('ui Slider passes aria-label to the thumb, not the root', () => {
    const { getByRole, container } = render(UiSlider, { props: { type: 'single', value: 30, 'aria-label': 'Opacity' } as never });
    expect(getByRole('slider', { name: 'Opacity' })).toBeTruthy();
    expect(container.querySelector('[data-slot="slider"]')!.hasAttribute('aria-label')).toBe(false);
  });

  it('ui Slider passes aria-labelledby to the thumb', () => {
    const label = document.createElement('span');
    label.id = 'feather-label';
    label.textContent = 'Feather';
    document.body.appendChild(label);
    const { getByRole } = render(UiSlider, { props: { type: 'single', value: 2, 'aria-labelledby': 'feather-label' } as never });
    expect(getByRole('slider', { name: 'Feather' })).toBeTruthy();
    label.remove();
  });

  it('the Slider widget names its thumb with its label', () => {
    const { getByRole } = render(Slider, { props: { label: 'Tolerance', value: 32 } });
    expect(getByRole('slider', { name: 'Tolerance' })).toBeTruthy();
  });
});
