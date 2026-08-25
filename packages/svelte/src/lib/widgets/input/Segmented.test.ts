// src/lib/widgets/input/Segmented.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Segmented from './Segmented.svelte';

describe('Segmented', () => {
  it('renders one option per entry with role=radio in single mode', () => {
    const { container } = render(Segmented, {
      props: { options: ['day', 'week', 'month'] }
    });
    const opts = container.querySelectorAll('[role="radio"]');
    expect(opts.length).toBe(3);
  });

  it('switches to role=checkbox when multiple is true', () => {
    const { container } = render(Segmented, {
      props: { options: ['a', 'b'], multiple: true }
    });
    const opts = container.querySelectorAll('[role="checkbox"]');
    expect(opts.length).toBe(2);
  });

  it('marks the selected option with aria-checked', () => {
    const { container } = render(Segmented, {
      props: { options: ['day', 'week', 'month'], value: 'week' }
    });
    const opts = container.querySelectorAll('[role="radio"]');
    expect(opts[0].getAttribute('aria-checked')).toBe('false');
    expect(opts[1].getAttribute('aria-checked')).toBe('true');
    expect(opts[2].getAttribute('aria-checked')).toBe('false');
  });

  it('emits onchange with the clicked value (single mode)', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Segmented, {
      props: { options: ['day', 'week', 'month'], value: 'day', onchange }
    });
    await fireEvent.click(getByText('week'));
    expect(onchange).toHaveBeenCalledWith('week');
  });

  it('toggles values in/out of the array (multiple mode)', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Segmented, {
      props: { options: ['a', 'b', 'c'], value: ['a'], multiple: true, onchange }
    });
    await fireEvent.click(getByText('b'));
    expect(onchange).toHaveBeenCalledWith(['a', 'b']);
  });
});
