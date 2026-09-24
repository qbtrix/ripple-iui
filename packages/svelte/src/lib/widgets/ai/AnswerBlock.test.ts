// @file widgets/ai/AnswerBlock.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-answer lane, 2026-09-16).
//   Behaviour coverage for AnswerBlock. The parts worth pinning are the ones a
//   reader cannot see from the markup: the word clock (that the reveal is one
//   word per 55ms tick and that a cite segment costs its own tick, so the chip
//   lands in the middle of the answer rather than at the end), that the body
//   text never changes when it is sliced across segments, the gating of the
//   action row and the follow-ups on the body finishing, the sources disclosure
//   contract copied from ReasoningTrace, and the reduced-motion branch. Like
//   TaskRows and PromptBar this widget is not in the spec registry, so there is
//   deliberately no registry-wiring test — it reaches callers through
//   `$lib/ui` only.
// UPDATED 2026-09-17 (fix: duplicate each keys): a reproduction block at the
//   bottom. The source lists were keyed by `domain` and the follow-ups by their
//   text, and Svelte 5 throws on a duplicate key in production builds as well as
//   dev, so two cited pages from one site, or a repeated follow-up, crashed the
//   whole block. Committed red first; the tests above are untouched.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AnswerBlock from './AnswerBlock.svelte';
import source from './AnswerBlock.svelte?raw';
import { danglingKeyframes } from '../../ui/__fixtures__/scoped-keyframes.js';

const WORD_MS = 55;

const SOURCES = [
  { name: 'Scoop Data', domain: 'scoopdata.io', href: 'https://scoopdata.io/' },
  { name: 'Trends Index', domain: 'trends.google.com', href: 'https://trends.google.com/' },
];

const BODY = [
  { text: 'Pistachio leads this month. ' },
  { cite: 0 },
  { text: 'Stone fruit is next.' },
];

const FOLLOW_UPS = ['Which flavors sell best in winter', 'Compare gelato margins'];

/** Total reveal steps: one per word plus one per cite. 4 + chip + 4. */
const STEPS = 4 + 1 + 4;

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The text of each StreamText run, in order. */
const runs = (c: Element) =>
  [...c.querySelectorAll('.ripple-stream-text__body')].map((n) => n.textContent);

/**
 * Svelte sets `inert` as a DOM PROPERTY and jsdom does not reflect it to an
 * attribute, so `hasAttribute('inert')` is false even when the element is
 * correctly inert. Confirmed against ReasoningTrace, which has shipped the same
 * pattern since the arc's foundation phase. Read the property.
 */
const isInert = (el: Element | null | undefined) => !!(el as HTMLElement | null)?.inert;

/** Render and run the reveal to completion. */
async function settled(props: Record<string, unknown> = {}) {
  vi.useFakeTimers();
  const result = render(AnswerBlock, { props: { body: BODY, sources: SOURCES, ...props } });
  await vi.advanceTimersByTimeAsync(WORD_MS * (STEPS + 2));
  return result;
}

describe('AnswerBlock — the word clock', () => {
  it('reveals one word per 55ms tick', async () => {
    vi.useFakeTimers();
    const { container } = render(AnswerBlock, { props: { body: BODY, sources: SOURCES } });
    const body = () => container.querySelector('.ripple-answer-body')?.textContent ?? '';
    expect(body()).toBe('');
    await vi.advanceTimersByTimeAsync(WORD_MS);
    expect(body()).toBe('Pistachio ');
    await vi.advanceTimersByTimeAsync(WORD_MS * 2);
    expect(body()).toBe('Pistachio leads this ');
  });

  it('spends a tick on the cite chip, so it lands mid-answer and not at the end', async () => {
    vi.useFakeTimers();
    const { container } = render(AnswerBlock, { props: { body: BODY, sources: SOURCES } });
    const chip = () => container.querySelector('.ripple-answer-chip');
    // Four words in: the first run is complete but the chip has not landed.
    await vi.advanceTimersByTimeAsync(WORD_MS * 4);
    expect(chip()).toBeFalsy();
    // The fifth tick is the chip's own, and the last run has not started.
    await vi.advanceTimersByTimeAsync(WORD_MS);
    expect(chip()?.textContent).toContain('scoopdata.io');
    expect(container.querySelector('.ripple-answer-body')?.textContent).not.toContain('Stone');
  });

  it('assembles the whole answer, with the chip between the two runs', async () => {
    const { container } = await settled();
    // Two runs, not one string: the chip sits between them in the DOM. (The
    // block's own textContent also carries the chip's decorative avatar
    // fallback letter, which is why the runs are read individually.)
    expect(runs(container)).toEqual(['Pistachio leads this month. ', 'Stone fruit is next.']);
    expect(container.querySelector('.ripple-answer-chip')?.textContent).toContain('scoopdata.io');
  });

  it('paints the whole answer at once under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    vi.useFakeTimers();
    const { container } = render(AnswerBlock, { props: { body: BODY, sources: SOURCES } });
    expect(container.querySelector('.ripple-answer-body')?.textContent).toContain('next.');
    expect(container.querySelector('.ripple-answer-chip')).toBeTruthy();
  });

  it('renders its frame with no body at all', () => {
    const { container } = render(AnswerBlock, { props: {} });
    expect(container.querySelector('.ripple-answer-block')).toBeTruthy();
    expect(container.querySelector('.ripple-answer-body')?.textContent).toBe('');
  });
});

describe('AnswerBlock — actions', () => {
  it('holds the action row inert until the answer finishes', async () => {
    vi.useFakeTimers();
    const { container } = render(AnswerBlock, { props: { body: BODY, sources: SOURCES } });
    const row = () => container.querySelector('.ripple-answer-block > div:nth-of-type(2)');
    expect(isInert(row())).toBe(true);
    expect(row()?.className).toContain('opacity-0');
    await vi.advanceTimersByTimeAsync(WORD_MS * (STEPS + 2));
    expect(isInert(row())).toBe(false);
    expect(row()?.className).toContain('opacity-100');
  });

  it('raises onaction with the kind, and copies nothing itself', async () => {
    const onaction = vi.fn();
    const { getByLabelText } = await settled({ onaction });
    await fireEvent.click(getByLabelText('Copy answer'));
    await fireEvent.click(getByLabelText('Bad answer'));
    expect(onaction.mock.calls.map((c) => c[0])).toEqual(['copy', 'down']);
  });

  it('labels each action instead of the source-s four identical ones', async () => {
    const { getByLabelText } = await settled();
    for (const label of ['Copy answer', 'Regenerate answer', 'Good answer', 'Bad answer']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });
});

describe('AnswerBlock — the sources disclosure', () => {
  it('derives the count label and lets labels override it', async () => {
    const { getByText } = await settled();
    expect(getByText('2 sources')).toBeTruthy();
    const other = await settled({ labels: { sources: '10 sources' } });
    expect(other.getByText('10 sources')).toBeTruthy();
  });

  it('opens the panel, points aria-controls at it, and drops inert', async () => {
    const { getByText, container } = await settled();
    const toggle = getByText('2 sources').closest('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const panel = container.querySelector(`#${toggle.getAttribute('aria-controls')}`);
    expect(panel).toBeTruthy();
    expect(isInert(panel)).toBe(true);
    expect(panel?.getAttribute('style')).toContain('0fr');
    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(isInert(panel)).toBe(false);
    expect(panel?.getAttribute('style')).toContain('1fr');
  });

  it('raises ontogglesources with the new state', async () => {
    const ontogglesources = vi.fn();
    const { getByText } = await settled({ ontogglesources });
    const toggle = getByText('2 sources').closest('button')!;
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    expect(ontogglesources.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('gives two blocks on one page different panel ids', async () => {
    const { container } = await settled();
    const second = await settled();
    const idOf = (c: Element) => c.querySelector('[aria-controls]')?.getAttribute('aria-controls');
    expect(idOf(container)).toBeTruthy();
    expect(idOf(container)).not.toBe(idOf(second.container));
  });

  it('hides the toggle entirely when there are no sources', async () => {
    const { queryByText } = await settled({ sources: [] });
    expect(queryByText(/source/)).toBeNull();
  });
});

describe('AnswerBlock — follow-ups', () => {
  it('raises onfollowup with the text and its index', async () => {
    const onfollowup = vi.fn();
    const { getByText } = await settled({ followUps: FOLLOW_UPS, onfollowup });
    await fireEvent.click(getByText(FOLLOW_UPS[1]).closest('button')!);
    expect(onfollowup).toHaveBeenCalledWith(FOLLOW_UPS[1], 1);
  });

  it('staggers them by 90ms once the answer finishes', async () => {
    const { getByText } = await settled({ followUps: FOLLOW_UPS });
    const second = getByText(FOLLOW_UPS[1]).closest('button')!;
    expect(second.className).toContain('ripple-answer-fade-up');
    expect(second.getAttribute('style')).toContain('90ms');
  });

  it('renders nothing for them when the caller supplies none', async () => {
    const { container } = await settled();
    expect(container.textContent).not.toContain('Follow-ups');
  });

  it('names none of its scoped keyframes from an inline style', async () => {
    // The PixelLoader bug (2026-09-17): Svelte hashes the keyframe names in this
    // component's stylesheet, and an inline style that names one bare points at
    // nothing. The stagger here only sets animation-delay inline, which is safe;
    // this keeps it that way.
    const { container } = await settled({ followUps: FOLLOW_UPS });
    const inline = [...container.querySelectorAll('[style]')].map((el) => el.getAttribute('style')).join(';');
    expect(inline, 'no staggered follow-up rendered').toContain('animation');
    expect(danglingKeyframes(source, inline)).toEqual([]);
  });
});

// Reproduces a pre-merge review finding (2026-09-17): a real answer routinely
// cites two pages from the same site, and a model can repeat a follow-up. Both
// lists were keyed on a value that is not unique per item, and a keyed each
// block with a duplicate key throws (`each_key_duplicate`) — the whole block
// fails to mount.
describe('AnswerBlock — duplicate values in its lists', () => {
  const SAME_DOMAIN = [
    { name: 'Svelte runes', domain: 'github.com', href: 'https://github.com/sveltejs/svelte/runes' },
    { name: 'Svelte issues', domain: 'github.com', href: 'https://github.com/sveltejs/svelte/issues' },
  ];

  it('renders two sources from the same domain', async () => {
    const { container, getByText } = await settled({
      body: [{ text: 'See both. ' }, { cite: 0 }, { cite: 1 }],
      sources: SAME_DOMAIN,
    });
    const panel = container.querySelector('.ripple-answer-panel');
    expect(panel?.textContent).toContain('Svelte runes');
    expect(panel?.textContent).toContain('Svelte issues');
    expect(container.querySelectorAll('.ripple-answer-chip')).toHaveLength(2);
    expect(getByText('2 sources')).toBeTruthy();
  });

  it('renders a repeated follow-up and reports the one that was clicked', async () => {
    const onfollowup = vi.fn();
    const repeated = ['Compare gelato margins', 'Compare gelato margins'];
    const { getAllByText } = await settled({ followUps: repeated, onfollowup });
    const buttons = getAllByText('Compare gelato margins').map((n) => n.closest('button')!);
    expect(buttons).toHaveLength(2);
    await fireEvent.click(buttons[1]);
    expect(onfollowup).toHaveBeenCalledWith('Compare gelato margins', 1);
  });
});
