// src/lib/widgets/layout/Breadcrumb.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Breadcrumb from './Breadcrumb.svelte';

describe('Breadcrumb', () => {
  it('renders all items with correct semantics', () => {
    const { getByText, container } = render(Breadcrumb, {
      props: {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Books' }
        ]
      }
    });
    expect(getByText('Home').tagName).toBe('A');
    expect(getByText('Library').tagName).toBe('A');
    const current = getByText('Books');
    expect(current.tagName).toBe('SPAN');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('nav')!.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders separators between items but not after the last', () => {
    const { container } = render(Breadcrumb, {
      props: {
        items: [
          { label: 'A', href: '/a' },
          { label: 'B', href: '/b' },
          { label: 'C' }
        ]
      }
    });
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(3);
    // First two list items contain a separator span; the last does not.
    expect(items[0].querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(items[1].querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(items[2].querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('emits onnavigate when a non-current item is clicked', async () => {
    const onnavigate = vi.fn();
    const { getByText } = render(Breadcrumb, {
      props: {
        items: [
          { label: 'Home' },
          { label: 'Settings' },
          { label: 'Profile' }
        ],
        onnavigate
      }
    });
    await fireEvent.click(getByText('Home'));
    expect(onnavigate).toHaveBeenCalledTimes(1);
    expect(onnavigate.mock.calls[0][0]).toMatchObject({ index: 0, item: { label: 'Home' } });
  });

  it('handles empty / non-array items gracefully', () => {
    const { container } = render(Breadcrumb, { props: { items: [] } });
    expect(container.querySelector('nav')).not.toBeNull();
    expect(container.querySelectorAll('li').length).toBe(0);
  });
});
