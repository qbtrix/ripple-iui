// src/lib/widgets/layout/Split.test.ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Split from './Split.svelte';

describe('Split', () => {
  it('renders both panes with default 50/50 split', () => {
    const { container } = render(Split, {
      props: { start: 'Left', end: 'Right' }
    });
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain('50%');
    expect(container.textContent).toContain('Left');
    expect(container.textContent).toContain('Right');
  });

  it('honours defaultSize prop', () => {
    const { container } = render(Split, {
      props: { start: 'L', end: 'R', defaultSize: 30 }
    });
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns.startsWith('30%')).toBe(true);
  });

  it('clamps defaultSize to min/max bounds', () => {
    const { container } = render(Split, {
      props: { start: 'L', end: 'R', defaultSize: 5, minSize: 20, maxSize: 80 }
    });
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns.startsWith('20%')).toBe(true);
  });

  it('exposes a separator with appropriate ARIA attributes', () => {
    const { container } = render(Split, {
      props: { start: 'L', end: 'R', direction: 'vertical' }
    });
    const sep = container.querySelector('[role="separator"]');
    expect(sep).not.toBeNull();
    expect(sep!.getAttribute('aria-orientation')).toBe('horizontal');
    expect(sep!.getAttribute('tabindex')).toBe('0');
  });

  it('responds to ArrowRight on horizontal separator with keyboard nav', async () => {
    const { container } = render(Split, {
      props: { start: 'L', end: 'R', defaultSize: 50 }
    });
    const sep = container.querySelector('[role="separator"]') as HTMLElement;
    await fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(sep.getAttribute('aria-valuenow')).toBe('51');
  });
});
