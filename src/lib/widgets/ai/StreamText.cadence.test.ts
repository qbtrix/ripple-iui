// @file widgets/ai/StreamText.cadence.test.ts
// @description NEW (2026-09-16, skin-answer). Pins the re-timed typewriter.
//   The widget used to release one character per tick and vary the tick
//   (`max(8, 1000/speed)`), which both chunked the reveal and capped it at 125
//   chars/sec whatever `speed` said. beautiful-ui's atoms/StreamText.tsx runs a
//   FIXED 9ms cadence and varies the step (`charsPerTick = 2`), which is what
//   makes the source read smooth. The port keeps `speed` as the only knob and
//   derives both halves from it, so the thing worth pinning is the arithmetic:
//   that a slow caller's interval did not move, that a fast caller now reaches
//   the rate it asked for, and that the step never over-runs the string.
//   Separate from StreamText.tail.test.ts on purpose — that file is the blur
//   tail's, and ai.test.ts is byte-identical to its pre-arc base, which is a
//   proof the arc leans on.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import StreamText from './StreamText.svelte';

const BODY = '.ripple-stream-text__body';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Reveal after `ms` of fake time at `speed` chars/sec. */
async function revealAfter(speed: number, ms: number, text = ALPHABET) {
  vi.useFakeTimers();
  const { container } = render(StreamText, { props: { text, speed } });
  await vi.advanceTimersByTimeAsync(ms);
  return container.querySelector(BODY)?.textContent ?? '';
}

describe('StreamText — cadence', () => {
  it('releases the source pair every 9ms at the source rate', async () => {
    // 222 chars/sec → step 2, tick 9.009ms. Two ticks land 4 characters.
    expect(await revealAfter(222, 9)).toBe('ab');
    expect(await revealAfter(222, 19)).toBe('abcd');
  });

  it('leaves a slow caller on exactly the interval it had before', async () => {
    // 100 chars/sec → step 1, tick 10ms. This is the pre-change behaviour and
    // the contract `speed` has always published: chars per second.
    expect(await revealAfter(100, 10)).toBe('a');
    expect(await revealAfter(100, 50)).toBe('abcde');
  });

  it('holds the chars/sec contract across the step boundary', async () => {
    // 150/s sits between one and two chars per 9ms tick. Rounding down here
    // would silently deliver 111/s; the step ceils and the tick stretches to
    // 13.3ms instead, so a second still buys ~150 characters.
    expect(await revealAfter(150, 14)).toBe('ab');
    expect(await revealAfter(150, 41)).toBe('abcdef');
  });

  it('no longer caps fast callers at the old 8ms floor', async () => {
    // The old shape was one character per max(8, 1000/speed) ms — 125/s was the
    // ceiling no matter what was asked for. 9 characters in the first tick now.
    expect(await revealAfter(1000, 9)).toBe('abcdefghi');
    expect((await revealAfter(1000, 9)).length).toBeGreaterThan(2);
  });

  it('never over-runs the end of the string', async () => {
    // Step 2 against an odd-length string: the last tick must clamp, not slice
    // past the end or leave the widget busy forever.
    const { container } = (vi.useFakeTimers(), render(StreamText, {
      props: { text: 'abcde', speed: 222 },
    }));
    await vi.advanceTimersByTimeAsync(500);
    expect(container.querySelector(BODY)?.textContent).toBe('abcde');
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('done');
  });

  it('paints the whole string at once under prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    expect(await revealAfter(222, 0)).toBe(ALPHABET);
  });
});
