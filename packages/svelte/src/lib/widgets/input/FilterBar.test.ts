// src/lib/widgets/input/FilterBar.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FilterBar from './FilterBar.svelte';

const options = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'owner', label: 'Owner' }
];

describe('FilterBar', () => {
  it('renders an active-filter chip per entry in `value`', () => {
    const { container, getByText } = render(FilterBar, {
      props: {
        options,
        value: [
          { key: 'status', label: 'Status', value: 'open' },
          { key: 'priority', label: 'Priority', value: 'high' }
        ]
      }
    });
    expect(getByText('Status')).not.toBeNull();
    expect(getByText('open')).not.toBeNull();
    expect(getByText('Priority')).not.toBeNull();
    expect(getByText('high')).not.toBeNull();
    // Two remove buttons + one add trigger.
    expect(container.querySelectorAll('button[aria-label^="Remove "]').length).toBe(2);
  });

  it('emits onchange with the filter removed when X is clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(FilterBar, {
      props: {
        options,
        value: [{ key: 'status', label: 'Status', value: 'open' }],
        onchange
      }
    });
    const removeBtn = container.querySelector('button[aria-label="Remove Status"]') as HTMLElement;
    expect(removeBtn).not.toBeNull();
    await fireEvent.click(removeBtn);
    expect(onchange).toHaveBeenCalledWith([]);
  });

  it('emits onchange with cleared array when "Clear all" is clicked', async () => {
    const onchange = vi.fn();
    const { getByText } = render(FilterBar, {
      props: {
        options,
        value: [
          { key: 'status', label: 'Status', value: 'open' },
          { key: 'priority', label: 'Priority', value: 'high' }
        ],
        onchange
      }
    });
    await fireEvent.click(getByText('Clear all'));
    expect(onchange).toHaveBeenCalledWith([]);
  });

  it('does not show "Clear all" when there are no active filters', () => {
    const { queryByText } = render(FilterBar, { props: { options, value: [] } });
    expect(queryByText('Clear all')).toBeNull();
  });

  it('does not show the add-trigger when all options are already active', () => {
    const { queryByText } = render(FilterBar, {
      props: {
        options,
        value: options.map((o) => ({ key: o.key, label: o.label }))
      }
    });
    expect(queryByText('Filter')).toBeNull();
  });
});
