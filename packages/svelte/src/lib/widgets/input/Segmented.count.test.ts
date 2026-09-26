// @file widgets/input/Segmented.count.test.ts
// @description NEW 2026-09-26 (feature pages canon, F1 / G4). The audit asked for
//   a per-option `count` on Segmented. The `badge` option from #139 (string or
//   number) already carries it; these tests pin the count semantics a feature
//   page needs: a 0 count renders "0", and the count joins the radio's
//   accessible name.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Segmented from './Segmented.svelte';

afterEach(cleanup);

describe('Segmented option counts (badge)', () => {
  it('renders a 0 count as "0" and omits the badge only when it is absent', () => {
    const { container } = render(Segmented, {
      options: [
        { value: 'all', label: 'All', badge: 12 },
        { value: 'zoom', label: 'Zoom', badge: 0 },
        { value: 'meet', label: 'Meet' },
      ],
      value: 'all',
    });
    const badges = [...container.querySelectorAll('[data-segmented-badge]')].map((b) => b.textContent!.trim());
    expect(badges).toEqual(['12', '0']);
  });

  it('the count is part of the radio text, so it is announced with the label', () => {
    const { getAllByRole } = render(Segmented, {
      options: [{ value: 'all', label: 'All', badge: 12 }],
      value: 'all',
    });
    expect(getAllByRole('radio')[0].textContent!.replace(/\s+/g, ' ').trim()).toBe('All 12');
  });
});
