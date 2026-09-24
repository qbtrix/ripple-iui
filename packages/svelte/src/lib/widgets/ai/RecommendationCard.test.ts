// @file widgets/ai/RecommendationCard.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-context lane, 2026-09-17).
//   Behaviour coverage for RecommendationCard: the confidence mapping (signal →
//   lit bars, tone and default label, with the label always present so colour
//   is never the only carrier), the inline entity/value chips and the contrast
//   class on a tinted value, the Accept event (once per option), the
//   Alternatives disclosure (aria-expanded, inert drawer, event), promoting an
//   alternative (event, and it resets Accepted), per-instance ids, and the
//   scoped-keyframe rule. Not in the spec registry, so no registry test.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import RecommendationCard from './RecommendationCard.svelte';
import source from './RecommendationCard.svelte?raw';
import { danglingKeyframes } from '../../ui/__fixtures__/scoped-keyframes.js';

const OPTIONS = [
  {
    key: 'high',
    body: [
      { text: 'Reorder waffle cones from ' },
      { entity: 'Cone King' },
      { text: ' with lead time ' },
      { value: '7 days', tone: 'success' as const },
    ],
    short: 'Reorder from Cone King · 7-day lead',
    signal: 3,
  },
  {
    key: 'review',
    body: [{ text: 'Switch vanilla to ' }, { value: 'Vanilla Madagascar' }, { text: ' for peak season.' }],
    signal: 2,
    cta: 'Configure',
  },
  { key: 'none', body: [{ text: 'Fall back to a full restock across every SKU.' }], signal: 0 },
];

const TITLE = 'Want me to place this restock order?';

const setup = (props: Record<string, unknown> = {}) =>
  render(RecommendationCard, { props: { title: TITLE, options: OPTIONS, ...props } });

/** The footer meter: the last one in the card. */
const footerMeter = (c: HTMLElement) => [...c.querySelectorAll('.ripple-rec-meter')].at(-1)!;
const lit = (meter: Element) => meter.querySelectorAll('[data-lit="true"]').length;

describe('RecommendationCard — confidence', () => {
  it.each([
    [3, 'success', 'High confidence'],
    [2, 'warning', 'Needs review'],
    [1, 'warning', 'Low confidence'],
    [0, 'none', 'No signal'],
  ])('signal %i lights that many bars, tone %s, label "%s"', (signal, tone, label) => {
    const { container, getByText } = setup({ options: [{ key: 'x', body: [{ text: 'Do it.' }], signal }] });
    const meter = footerMeter(container);
    expect(lit(meter)).toBe(signal);
    expect(meter.getAttribute('data-tone')).toBe(tone);
    expect(meter.getAttribute('aria-hidden')).toBe('true');
    // The label is real text beside the bars, so colour never carries it alone.
    expect(getByText(label)).toBeTruthy();
  });

  it('clamps out-of-range signals and honours a caller label', () => {
    const { container, getByText } = setup({
      options: [{ key: 'x', body: [{ text: 'Do it.' }], signal: 9, label: 'Very sure' }],
    });
    expect(lit(footerMeter(container))).toBe(3);
    expect(getByText('Very sure')).toBeTruthy();
  });
});

describe('RecommendationCard — the sentence', () => {
  it('renders text with inline entity and value chips, in order', () => {
    const { container, getByRole } = setup();
    expect(getByRole('group', { name: TITLE })).toBeTruthy();
    const body = container.querySelector('.ripple-rec-fade-in')!;
    // Chip leaves a whitespace-only text node inside its flex box, which renders
    // nothing but shows up in textContent, so whitespace is normalised. The "C"
    // is the entity's decorative monogram.
    expect(body.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Reorder waffle cones from CCone King with lead time 7 days'
    );
    const value = within(body as HTMLElement).getByText('7 days');
    // The raw success token on its tint is 2.1:1 in light; the chip must carry the mixed text colour.
    expect(value.className).toContain('text-[color-mix(in_oklab,var(--ripple-success)_55%');
    expect(value.className).not.toMatch(/(^|\s)text-ripple-success(\s|$)/);
  });
});

describe('RecommendationCard — Accept', () => {
  it('raises onaccept with the key and index, once, and shows Accepted', async () => {
    const onaccept = vi.fn();
    const { getByRole, container } = setup({ onaccept });
    const button = getByRole('button', { name: 'Accept' });
    await fireEvent.click(button);
    await fireEvent.click(button);
    expect(onaccept).toHaveBeenCalledTimes(1);
    expect(onaccept).toHaveBeenCalledWith({ key: 'high', index: 0 });
    expect(button.textContent).toContain('Accepted');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain('Reorder from Cone King');
  });

  it("uses the option's own call to action", () => {
    const { getByRole } = setup({ selected: 1 });
    expect(getByRole('button', { name: 'Configure' })).toBeTruthy();
  });
});

describe('RecommendationCard — Alternatives', () => {
  it('toggles the drawer as a disclosure and raises ontogglealternatives', async () => {
    const ontogglealternatives = vi.fn();
    const { getByRole, container } = setup({ ontogglealternatives });
    const button = getByRole('button', { name: 'Alternatives' });
    const drawer = container.querySelector(`#${CSS.escape(button.getAttribute('aria-controls')!)}`) as HTMLElement;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    // Svelte sets `inert` as a property; jsdom does not reflect it to an attribute.
    expect(drawer.inert).toBe(true);
    await fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.inert).toBe(false);
    expect(ontogglealternatives).toHaveBeenLastCalledWith(true);
    await fireEvent.click(button);
    expect(ontogglealternatives).toHaveBeenLastCalledWith(false);
  });

  it('lists the other options, and picking one promotes it, raises onselect and resets Accepted', async () => {
    const onselect = vi.fn();
    const { getByRole, container } = setup({ onselect });
    await fireEvent.click(getByRole('button', { name: 'Accept' }));
    const toggle = getByRole('button', { name: 'Alternatives' });
    await fireEvent.click(toggle);
    const drawer = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const choices = within(drawer).getAllByRole('button');
    // Everything except the shown option. The short line falls back to plain body text.
    expect(choices.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Switch vanilla to Vanilla Madagascar for peak season. Needs review',
      'Fall back to a full restock across every SKU. No signal',
    ]);
    await fireEvent.click(choices[1]);
    expect(onselect).toHaveBeenCalledWith({ key: 'none', index: 2 });
    expect(container.querySelector('.ripple-rec-fade-in')?.textContent).toContain('full restock');
    expect(getByRole('button', { name: 'Accept' })).toBeTruthy();
    expect(lit(footerMeter(container))).toBe(0);
  });

  it('offers no Alternatives button when there is only one option', () => {
    const { queryByRole } = setup({ options: [OPTIONS[0]] });
    expect(queryByRole('button', { name: 'Alternatives' })).toBeNull();
  });
});

describe('RecommendationCard — frame', () => {
  it('renders its question with no options at all', () => {
    const { getByText, queryAllByRole } = render(RecommendationCard, { props: { title: TITLE } });
    expect(getByText(TITLE)).toBeTruthy();
    expect(queryAllByRole('button')).toHaveLength(0);
  });

  it('gives each instance its own ids', () => {
    setup();
    setup();
    const ids = [...document.querySelectorAll('[aria-controls]')].map((b) => b.getAttribute('aria-controls'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('names no scoped keyframe from an inline style', async () => {
    const { container, getByRole } = setup();
    await fireEvent.click(getByRole('button', { name: 'Alternatives' }));
    const inline = [...container.querySelectorAll('[style]')].map((el) => el.getAttribute('style')).join(';');
    expect(danglingKeyframes(source, inline)).toEqual([]);
  });
});
