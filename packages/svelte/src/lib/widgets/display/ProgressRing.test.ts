// src/lib/widgets/display/ProgressRing.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ProgressRing from './ProgressRing.svelte';

describe('ProgressRing', () => {
  it('renders with role="meter" and ARIA bounds', () => {
    const { container } = render(ProgressRing, { props: { value: 40 } });
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter!.getAttribute('aria-valuemin')).toBe('0');
    expect(meter!.getAttribute('aria-valuemax')).toBe('100');
    expect(meter!.getAttribute('aria-valuenow')).toBe('40');
  });

  it('shows percent label by default', () => {
    const { container } = render(ProgressRing, { props: { value: 65, max: 100 } });
    expect(container.textContent).toContain('65%');
  });

  it('honours custom label prop', () => {
    const { container } = render(ProgressRing, { props: { value: 3, max: 5, label: '3/5' } });
    expect(container.textContent).toContain('3/5');
  });

  it('hides the label when hideLabel is true', () => {
    const { container } = render(ProgressRing, { props: { value: 50, hideLabel: true } });
    expect(container.textContent).not.toContain('50%');
  });
});
