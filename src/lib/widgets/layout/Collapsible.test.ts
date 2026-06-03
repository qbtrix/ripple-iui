// src/lib/widgets/layout/Collapsible.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Collapsible from './Collapsible.svelte';

describe('Collapsible', () => {
  it('renders a trigger with the title and aria-expanded=false by default', () => {
    const { getByRole } = render(Collapsible, { props: { title: 'Details' } });
    const btn = getByRole('button');
    expect(btn.textContent).toContain('Details');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens by default when defaultOpen is true', () => {
    const { getByRole } = render(Collapsible, {
      props: { title: 'Details', defaultOpen: true }
    });
    expect(getByRole('button').getAttribute('aria-expanded')).toBe('true');
  });

  it('emits onchange when toggled', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(Collapsible, {
      props: { title: 'Details', onchange }
    });
    await fireEvent.click(getByRole('button'));
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it('respects controlled `value` prop', () => {
    const { getByRole } = render(Collapsible, {
      props: { title: 'Details', value: true }
    });
    expect(getByRole('button').getAttribute('aria-expanded')).toBe('true');
  });
});
