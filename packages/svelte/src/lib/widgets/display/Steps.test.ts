// Steps.test.ts — per-step `status` ('done' | 'current' | 'upcoming' | 'failed'): the current
// step carries aria-current="step", done and failed pips draw a glyph with a spoken label
// (never colour alone), an explicit `number` still wins over the glyph, and steps without a
// status render exactly as before, in both orientations.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Steps from './Steps.svelte';

const PIP_V = 'flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums';
const PIP_H = 'flex size-7 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums';

const pips = (root: ParentNode) =>
  Array.from(root.querySelectorAll('li')).map((li) => li.querySelector<HTMLElement>('.size-7')!);

describe('Steps', () => {
  it.each([
    ['vertical', PIP_V],
    ['horizontal', PIP_H],
  ] as const)('renders %s steps without a status exactly as before', (orientation, cls) => {
    const { container } = render(Steps, {
      props: { orientation, steps: [{ title: 'One' }, { title: 'Two', number: 'B' }, { title: 'Three' }] },
    });
    expect(pips(container).map((p) => p.className)).toEqual([cls, cls, cls]);
    expect(pips(container).map((p) => p.textContent?.trim())).toEqual(['1', 'B', '3']);
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it.each(['vertical', 'horizontal'] as const)('marks state in %s layout', (orientation) => {
    const { container } = render(Steps, {
      props: {
        orientation,
        steps: [
          { title: 'Plan', status: 'done' },
          { title: 'Build', status: 'failed' },
          { title: 'Check', status: 'current' },
          { title: 'Land', status: 'upcoming' },
        ],
      },
    });
    const items = Array.from(container.querySelectorAll('li'));
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current.length).toBe(1);
    expect(current[0]).toBe(items[2]);
    expect(items.map((li) => li.dataset.status)).toEqual(['done', 'failed', 'current', 'upcoming']);

    const [done, failed, now, next] = pips(container);
    expect(done.querySelector('svg')).not.toBeNull();
    expect(done.textContent?.trim()).toBe('Done');
    expect(done.querySelector('.sr-only')?.textContent).toBe('Done');
    expect(done.className).toContain('bg-ripple-accent');
    expect(failed.querySelector('.sr-only')?.textContent).toBe('Failed');
    expect(failed.className).toContain('bg-ripple-error');
    expect(now.textContent?.trim()).toBe('3');
    expect(now.className).toContain('ring-ripple-accent');
    expect(next.textContent?.trim()).toBe('4');
    expect(next.className).toContain('text-ripple-muted-foreground');
    expect(items[3].textContent).toContain('Land');
    expect(items[3].querySelector('.font-semibold:not(.size-7)')!.className).toContain('text-ripple-muted-foreground');
  });

  it('keeps an explicit number over the done glyph', () => {
    const { container } = render(Steps, { props: { steps: [{ title: 'One', number: 7, status: 'done' }] } });
    const [pip] = pips(container);
    expect(pip.textContent?.trim()).toBe('7');
    expect(pip.querySelector('svg')).toBeNull();
  });
});
