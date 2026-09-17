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
//   Separate from StreamText.tail.test.ts on purpose, since that file is the
//   blur tail's.
// UPDATED 2026-09-17 (pre-merge review corrections): two claims here were
//   wrong. (1) This header said ai.test.ts is byte-identical to its pre-arc
//   base. The same PR adds one test to ai.test.ts (ReasoningTrace's
//   scoped-keyframe check). No existing test in it changed, so its `speed: 100`
//   cases still run as they did, but the file is not byte-identical. (2) "A slow
//   caller keeps exactly the interval it had before" holds only up to
//   1000/9 ≈ 111.1 chars/sec, where the step is still 1. From there to 125 the
//   rate is unchanged but the reveal is chunkier: 2 characters every 16-18ms
//   where it used to be 1 every 8-9ms. The test name now says where the line is,
//   and a new test pins that band.
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

  it('leaves a caller at or below 111 chars/sec on exactly the interval it had before', async () => {
    // 100 chars/sec → step 1, tick 10ms. This is the pre-change behaviour and
    // the contract `speed` has always published: chars per second.
    expect(await revealAfter(100, 10)).toBe('a');
    expect(await revealAfter(100, 50)).toBe('abcde');
  });

  it('keeps the rate but doubles the step between 111 and 125 chars/sec', async () => {
    // 120/s: the old code released 1 char every 8.3ms, so 'a' was on screen by
    // 9ms. The step ceils to 2 and the tick stretches to 16.7ms: nothing at 9ms,
    // then a pair. Same 120/s, in pairs.
    expect(await revealAfter(120, 9)).toBe('');
    expect(await revealAfter(120, 17)).toBe('ab');
    expect(await revealAfter(120, 34)).toBe('abcd');
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
