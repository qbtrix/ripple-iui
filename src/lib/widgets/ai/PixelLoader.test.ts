// @file widgets/ai/PixelLoader.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-answer lane, 2026-09-16).
//   Behaviour coverage for PixelLoader. The grid's whole character is in two
//   derived arrays a reader cannot check by eye — the chevron delay ramp and the
//   orbit's clockwise perimeter with its dark centre — so those are pinned cell
//   by cell. The elapsed timer is pinned including the minute rollover, which is
//   the branch that only runs after 60 seconds and would otherwise never be
//   exercised. The reduced-motion rule is asserted against the source text
//   because the freeze is CSS-only: the cell delays are inline styles, so the
//   guard has to out-rank them, and a stylesheet rule that quietly lost that
//   fight would look identical in a mounted DOM.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { compile } from 'svelte/compiler';
import PixelLoader from './PixelLoader.svelte';
import source from './PixelLoader.svelte?raw';

const cells = (c: Element) => [...c.querySelectorAll('.ripple-pixel-cell')] as HTMLElement[];
const delayOf = (el: HTMLElement) => el.style.animation.match(/(\d+)ms infinite/)?.[1] ?? null;

afterEach(() => vi.useRealTimers());

describe('PixelLoader — the grid', () => {
  it('draws nine cells', () => {
    const { container } = render(PixelLoader, { props: {} });
    expect(cells(container)).toHaveLength(9);
  });

  it('ramps the drive wavefront into a chevron', () => {
    // (column + distance from the middle row) × 90ms. The middle row leads and
    // the corners trail, which is what bends the front.
    const { container } = render(PixelLoader, { props: { variant: 'drive' } });
    expect(cells(container).map(delayOf)).toEqual(
      ['90', '180', '270', '0', '90', '180', '90', '180', '270'].map(String)
    );
  });

  it('gives dots the same wavefront but round cells', () => {
    const { container } = render(PixelLoader, { props: { variant: 'dots' } });
    const drive = render(PixelLoader, { props: { variant: 'drive' } });
    expect(cells(container).map(delayOf)).toEqual(cells(drive.container).map(delayOf));
    expect(cells(container).every((c) => c.className.includes('rounded-full'))).toBe(true);
    expect(cells(drive.container).some((c) => c.className.includes('rounded-full'))).toBe(false);
  });

  it('walks orbit clockwise round the rim and leaves the centre dark', () => {
    const { container } = render(PixelLoader, { props: { variant: 'orbit' } });
    const grid = cells(container);
    // Perimeter order 0,1,2,5,8,7,6,3 at 110ms apart.
    expect(grid.map(delayOf)).toEqual(['0', '110', '220', '770', null, '330', '660', '550', '440']);
    // The centre never lights: no animation, and dimmer than its neighbours.
    expect(grid[4].style.animation).toBe('none');
    expect(grid[4].style.opacity).toBe('0.07');
    expect(grid[0].style.opacity).toBe('0.15');
  });

  it('falls back to drive for an unknown variant rather than rendering nothing', () => {
    const { container } = render(PixelLoader, { props: { variant: 'bogus' as never } });
    expect(cells(container)).toHaveLength(9);
    expect(delayOf(cells(container)[3])).toBe('0');
  });
});

describe('PixelLoader — the label and the timer', () => {
  it('shows the label, and defaults it', () => {
    expect(render(PixelLoader, { props: {} }).getByText('Churning')).toBeTruthy();
    expect(
      render(PixelLoader, { props: { label: 'Reading the ledger' } }).getByText('Reading the ledger')
    ).toBeTruthy();
  });

  it('is a status region', () => {
    const { getByRole } = render(PixelLoader, { props: {} });
    expect(getByRole('status')).toBeTruthy();
  });

  it('counts up in tenths of a second', async () => {
    vi.useFakeTimers();
    const { getByText } = render(PixelLoader, { props: {} });
    expect(getByText('0.0s')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(1500);
    expect(getByText('1.5s')).toBeTruthy();
  });

  it('rolls over into minutes past 60 seconds', async () => {
    vi.useFakeTimers();
    const { getByText } = render(PixelLoader, { props: {} });
    await vi.advanceTimersByTimeAsync(63_400);
    expect(getByText('1m 3.4s')).toBeTruthy();
  });

  it('stops its timer when it unmounts', async () => {
    vi.useFakeTimers();
    const { unmount } = render(PixelLoader, { props: {} });
    await vi.advanceTimersByTimeAsync(500);
    unmount();
    // A leaked interval would keep firing against a destroyed component.
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('PixelLoader — reduced motion', () => {
  it('carries a guard that can actually out-rank the inline cell delays', () => {
    // The per-cell animation is an inline style, so a plain stylesheet rule
    // loses to it. Only `!important` wins. This is the one place in the widget
    // where dropping a keyword silently disables the accessibility behaviour.
    const guard = source.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n  \}/)?.[0];
    expect(guard, 'no reduced-motion block in PixelLoader').toBeTruthy();
    expect(guard).toContain('.ripple-pixel-cell');
    expect(guard).toMatch(/animation:\s*none\s*!important/);
  });

  it('keeps the timer out of the guard — elapsed time is information', async () => {
    const guard = source.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n  \}/)?.[0];
    expect(guard).not.toContain('tabular-nums');
    // And it really does tick: the effect has no reduced-motion branch at all.
    expect(source).not.toMatch(/matchMedia/);
  });
});

// Reproduces a captain-reported bug (2026-09-17): the pixels do not animate,
// while the elapsed timer beside them keeps counting. Svelte scopes every
// `@keyframes` declared in a component <style> block, renaming it to a hashed
// `svelte-<hash>-<name>`, and rewrites the references it can see inside that
// same stylesheet. An `animation` set through an inline `style:` directive is
// invisible to that rewrite, so it keeps pointing at the bare name, which no
// longer exists. The browser drops the animation without a warning. The
// existing tests read the inline string and pass, which is how this shipped.
describe('PixelLoader — the grid actually animates', () => {
  /** Keyframe-looking tokens, hashed or bare, in an animation value. */
  const keyframeTokens = (value: string) =>
    [...value.matchAll(/(?:svelte-[a-z0-9]+-)?ripple-[\w-]+/g)].map((m) => m[0]);

  it('references only keyframes the compiled stylesheet declares', () => {
    const { css } = compile(source, { filename: 'PixelLoader.svelte', css: 'external' });
    const compiled = css?.code ?? '';
    const declared = new Set([...compiled.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));

    // Everything a cell could animate with: its inline style on a real render,
    // plus any animation declared for it in the compiled stylesheet.
    const { container } = render(PixelLoader, { props: { variant: 'drive' } });
    const fromInline = cells(container).flatMap((el) => keyframeTokens(el.style.animation));
    const fromCss = [...compiled.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)].flatMap((m) =>
      keyframeTokens(m[1])
    );
    const referenced = [...new Set([...fromInline, ...fromCss])];

    expect(referenced.length, 'no cell animates with any keyframe at all').toBeGreaterThan(0);
    for (const name of referenced) {
      expect(
        declared.has(name),
        `a cell animates "${name}", but the compiled CSS only declares: ${[...declared].join(', ') || '(none)'}`
      ).toBe(true);
    }
  });
});
