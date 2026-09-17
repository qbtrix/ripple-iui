// @file widgets/ai/PixelLoader.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-answer lane, 2026-09-16).
//   Behaviour coverage for PixelLoader. The grid's whole character is in two
//   derived arrays a reader cannot check by eye — the chevron delay ramp and the
//   orbit's clockwise perimeter with its dark centre — so those are pinned cell
//   by cell. The elapsed timer is pinned including the minute rollover, which is
//   the branch that only runs after 60 seconds and would otherwise never be
//   exercised. The reduced-motion rule is asserted against the source text
//   because the freeze is CSS-only, and a stylesheet rule that quietly lost the
//   cascade would look identical in a mounted DOM.
// UPDATED 2026-09-17 (fix: dead grid animation): the cells no longer carry an
//   inline `animation`; the keyframe is named in the scoped stylesheet on
//   `.ripple-pixel-lit`, and each cell passes only `--delay`. So the delay ramp
//   is read from `--delay`, the dark orbit centre is pinned as "never gets the
//   lit class", and the reduced-motion comment no longer claims it out-ranks an
//   inline style. The expected values are unchanged. The reproduction test at
//   the bottom was committed red first and is untouched.
// UPDATED 2026-09-17 (fix: live region floods screen readers): a reproduction
//   block at the bottom. `role="status"` sat on the row that holds the elapsed
//   timer, which re-renders every 100ms, so assistive tech was handed a new
//   announcement ten times a second. Committed red first; the tests above are
//   untouched.
// UPDATED 2026-09-17 (fix: elapsed time drifts low): a second reproduction
//   block. The timer counted interval ticks, and browsers throttle intervals in
//   background tabs, so after a tab switch it showed far less time than had
//   passed. The test stretches the interval the way a throttled tab does.
//   Committed red first. `afterEach` now also restores spies, before the real
//   timers come back.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { compile } from 'svelte/compiler';
import PixelLoader from './PixelLoader.svelte';
import source from './PixelLoader.svelte?raw';

const cells = (c: Element) => [...c.querySelectorAll('.ripple-pixel-cell')] as HTMLElement[];
const delayOf = (el: HTMLElement) => el.style.getPropertyValue('--delay').replace(/ms$/, '') || null;

afterEach(() => {
  // Spies first: a spy wraps the fake setInterval, and restoring it after the
  // real timers return would put the fake back.
  vi.restoreAllMocks();
  vi.useRealTimers();
});

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
    // The centre never lights: no lit class (so no animation), and dimmer than
    // its neighbours.
    expect(grid[4].classList.contains('ripple-pixel-lit')).toBe(false);
    expect(grid[0].classList.contains('ripple-pixel-lit')).toBe(true);
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
  it('carries a guard that out-ranks the lit-cell animation', () => {
    // The animation sits on `.ripple-pixel-lit` in the same stylesheet. The
    // guard matches its specificity and comes later, and `!important` keeps it
    // winning if that selector ever grows. Dropping the keyword is the one edit
    // that could silently disable the accessibility behaviour.
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

// Reproduces a pre-merge review finding (2026-09-17): the status role was on the
// whole row, so the ticking elapsed time was inside the live region and a screen
// reader queued "0.1s, 0.2s, ..." for as long as the agent worked. The label is
// what belongs in the live region; the timer can be read on demand.
describe('PixelLoader — the live region', () => {
  it('keeps the ticking timer out of the status region', () => {
    const { getByRole, getByText } = render(PixelLoader, { props: {} });
    const status = getByRole('status');
    expect(status.textContent).toContain('Churning');
    expect(status.contains(getByText('0.0s'))).toBe(false);
  });

  it('does not change the status region on a tick', async () => {
    vi.useFakeTimers();
    const { getByRole, getByText } = render(PixelLoader, { props: {} });
    const before = getByRole('status').textContent;
    await vi.advanceTimersByTimeAsync(1500);
    expect(getByText('1.5s')).toBeTruthy();
    expect(getByRole('status').textContent).toBe(before);
  });
});

// Reproduces a pre-merge review finding (2026-09-17): the elapsed time was a
// count of 100ms interval callbacks. A background tab throttles intervals to
// about one a second (less after a few minutes hidden), so a user who came back
// to a long-running agent saw a fraction of the real time.
describe('PixelLoader — elapsed time under a throttled timer', () => {
  it('follows the clock, not the number of ticks that fired', async () => {
    vi.useFakeTimers();
    // A throttled tab: every 100ms interval actually fires once a second.
    const fakeSetInterval = globalThis.setInterval;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      fn: () => void,
      _ms?: number,
      ...args: unknown[]
    ) => fakeSetInterval(fn, 1000, ...args)) as typeof setInterval);
    const { getByText } = render(PixelLoader, { props: {} });
    // Ten seconds pass, and only ten ticks fire.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(getByText('10.0s')).toBeTruthy();
  });
});
