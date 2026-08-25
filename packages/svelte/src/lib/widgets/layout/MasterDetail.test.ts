// src/lib/widgets/layout/MasterDetail.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MasterDetail from './MasterDetail.svelte';

const items = [
  { id: 1, label: 'Alpha', description: 'first' },
  { id: 2, label: 'Beta', description: 'second' },
  { id: 3, label: 'Gamma', description: 'third' }
];

describe('MasterDetail', () => {
  it('renders master items as listbox options', () => {
    const { container, getByText } = render(MasterDetail, { props: { items } });
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    const opts = container.querySelectorAll('[role="option"]');
    expect(opts.length).toBe(3);
    expect(getByText('Alpha')).not.toBeNull();
    expect(getByText('Beta')).not.toBeNull();
  });

  it('marks the option matching `value` as selected', () => {
    const { container } = render(MasterDetail, { props: { items, value: 2 } });
    const opts = container.querySelectorAll('[role="option"]');
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });

  it('emits onchange with the selected value', async () => {
    const onchange = vi.fn();
    const { getByText } = render(MasterDetail, { props: { items, onchange } });
    await fireEvent.click(getByText('Beta'));
    expect(onchange).toHaveBeenCalledWith(2);
  });

  it('shows empty-state copy when nothing is selected and no children/detail', () => {
    const { getByText } = render(MasterDetail, {
      props: { items, emptyText: 'Pick something' }
    });
    expect(getByText('Pick something')).not.toBeNull();
  });

  it('renders descriptions when descriptionKey is present on items', () => {
    const { getByText } = render(MasterDetail, { props: { items } });
    expect(getByText('first')).not.toBeNull();
    expect(getByText('second')).not.toBeNull();
  });
});
