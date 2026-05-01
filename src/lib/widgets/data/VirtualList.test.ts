// src/lib/widgets/data/VirtualList.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import VirtualList from './VirtualList.svelte';

describe('VirtualList', () => {
  it('renders empty state when items is empty', () => {
    const { container } = render(VirtualList, {
      props: { items: [], emptyText: 'Nothing here' }
    });
    expect(container.textContent).toContain('Nothing here');
  });

  it('only renders a windowed subset of large lists', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ label: `Item ${i}` }));
    const { container } = render(VirtualList, {
      props: { items, itemHeight: 30, height: 300 }
    });
    // We expect well below 100 rendered rows (window + overscan), not all 1000.
    const rows = container.querySelectorAll('[role="option"]');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
  });

  it('annotates rendered rows with aria-setsize equal to items.length', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ label: `Item ${i}` }));
    const { container } = render(VirtualList, {
      props: { items, itemHeight: 30, height: 300 }
    });
    const first = container.querySelector('[role="option"]');
    expect(first?.getAttribute('aria-setsize')).toBe('50');
  });
});
