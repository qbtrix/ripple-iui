// @file widgets/ai/StreamText.tail.test.ts
// @description NEW (2026-09-16, skin-gaps). Covers the blur tail ported from
//   beautiful-ui's atoms/StreamText.tsx: while the widget is busy, the newest
//   six characters move into their own span so CSS can blur them behind a mask
//   ramp. The branches worth pinning are the ones a reader cannot see from the
//   markup — that the tail only exists while busy, that it never appears on the
//   markdown branch (Markdown owns its tree and cannot be sliced), that reduced
//   motion drops it, and above all that splitting the string never changes the
//   text the user reads or the assistive tech announces.
//   Lives beside ai.test.ts rather than inside it: ai.test.ts is byte-identical
//   to its pre-arc base and that is a proof the arc leans on.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import StreamText from './StreamText.svelte';

const TAIL = 'ripple-stream-tail';
const BODY = '.ripple-stream-text__body';

/** Force matchMedia to answer "reduce" before a render. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent() {
      return false;
    },
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('StreamText — blur tail', () => {
  it('splits the newest 6 characters into the tail while streaming', () => {
    const { container } = render(StreamText, {
      props: { text: 'the answer is forty two', streaming: true },
    });
    const tail = container.querySelector(`.${TAIL}`);
    expect(tail, 'no tail span while streaming').toBeTruthy();
    expect(tail?.textContent).toBe('ty two');
  });

  it('does not change the text a reader (or aria-live) gets', () => {
    const text = 'the answer is forty two';
    const { container } = render(StreamText, { props: { text, streaming: true } });
    expect(container.querySelector(BODY)?.textContent).toBe(text);
  });

  it('carries no tail once the stream settles', () => {
    const { container } = render(StreamText, {
      props: { text: 'all done here', streaming: true, done: true },
    });
    expect(container.querySelector(`.${TAIL}`)).toBeFalsy();
    expect(container.querySelector(BODY)?.textContent).toBe('all done here');
  });

  it('carries no tail when nothing is streaming at all', () => {
    const { container } = render(StreamText, { props: { text: 'static text' } });
    expect(container.querySelector(`.${TAIL}`)).toBeFalsy();
  });

  it('rides the typewriter reveal, and never over-slices a short string', async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(StreamText, { props: { text: 'abcdefghij', speed: 100 } });
      // 100 chars/sec → 10ms per char. Three ticks: fewer chars revealed than
      // the 6-char tail, so the whole slice is tail and the head is empty.
      await vi.advanceTimersByTimeAsync(30);
      expect(container.querySelector(BODY)?.textContent).toBe('abc');
      expect(container.querySelector(`.${TAIL}`)?.textContent).toBe('abc');
      // Past the tail length the head starts filling in behind it.
      await vi.advanceTimersByTimeAsync(50);
      expect(container.querySelector(BODY)?.textContent).toBe('abcdefgh');
      expect(container.querySelector(`.${TAIL}`)?.textContent).toBe('cdefgh');
      // Run it out — the tail goes away with busy.
      await vi.advanceTimersByTimeAsync(40);
      expect(container.querySelector(BODY)?.textContent).toBe('abcdefghij');
      expect(container.querySelector(`.${TAIL}`)).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops the tail under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { container } = render(StreamText, {
      props: { text: 'the answer is forty two', streaming: true },
    });
    expect(container.querySelector(`.${TAIL}`)).toBeFalsy();
    expect(container.querySelector(BODY)?.textContent).toBe('the answer is forty two');
  });

  it('keeps the tail when reduced motion is NOT set (guards the stub itself)', () => {
    stubReducedMotion(false);
    const { container } = render(StreamText, {
      props: { text: 'the answer is forty two', streaming: true },
    });
    expect(container.querySelector(`.${TAIL}`)).toBeTruthy();
  });

  it('leaves the markdown branch unsliced', () => {
    const { container } = render(StreamText, {
      props: { text: 'the answer is forty two', streaming: true, markdown: true },
    });
    expect(container.querySelector(`.${TAIL}`)).toBeFalsy();
    expect(container.querySelector(BODY)?.textContent).toContain('forty two');
  });
});
