// @file widgets/ai/ContextCards.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-context lane, 2026-09-17).
//   Behaviour coverage for ContextCards: the header count (derived from the
//   chunks, overridable because the full set can be larger than what is shown),
//   the character-count label, the file chip as a real link or plain text, the
//   extension-derived badge, per-instance ids for the list label, and the
//   scoped-keyframe rule. Not in the spec registry, so no registry test.
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/svelte';
import ContextCards from './ContextCards.svelte';
import source from './ContextCards.svelte?raw';
import { danglingKeyframes } from '../../ui/__fixtures__/scoped-keyframes.js';

const CHUNKS = [
  {
    title: 'Vendor onboarding rule',
    chars: 290,
    body: 'Cold-chain certification must be verified before a new dairy is added.',
    source: 'Dairy Onboarding SOP.pdf',
    href: 'https://example.com/sop.pdf',
    color: 'var(--ripple-error)',
  },
  {
    title: 'Seasonal demand row',
    chars: 1250,
    body: 'Q4 velocity table: pistachio +18%, vanilla +6%.',
    source: 'Sales Velocity Export.csv',
  },
];

const header = (c: HTMLElement) => c.querySelector('.ripple-context-cards > div')!;

describe('ContextCards — the count', () => {
  it('defaults the header count to the number of chunks', () => {
    const { container } = render(ContextCards, { props: { chunks: CHUNKS } });
    expect(header(container).textContent).toContain('All chunks');
    expect(header(container).textContent).toContain('2');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('shows the size of the whole set when the caller passes one', () => {
    const { container } = render(ContextCards, {
      props: { chunks: CHUNKS, count: 32, labels: { header: 'Retrieved' } },
    });
    expect(header(container).textContent?.replace(/\s+/g, ' ').trim()).toBe('Retrieved 32');
  });

  it('renders the header with zero and an empty list when there are no chunks', () => {
    const { container } = render(ContextCards, { props: {} });
    expect(header(container).textContent).toContain('0');
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('ContextCards — a chunk', () => {
  it('formats the character count, and hides it when absent', () => {
    const { getByText, container } = render(ContextCards, {
      props: { chunks: [...CHUNKS, { title: 'One', chars: 1, body: 'x', source: 'a.md' }, { title: 'None', body: 'y', source: 'b.md' }] },
    });
    expect(getByText('290 characters')).toBeTruthy();
    expect(getByText('1,250 characters')).toBeTruthy();
    expect(getByText('1 character')).toBeTruthy();
    expect(container.querySelectorAll('li')[3].textContent).not.toContain('character');
  });

  it('makes the source a real new-tab link named by the file, or plain text without href', () => {
    const { container } = render(ContextCards, { props: { chunks: CHUNKS } });
    const [withHref, withoutHref] = container.querySelectorAll('li');
    const link = within(withHref as HTMLElement).getByRole('link', { name: /Dairy Onboarding SOP\.pdf/ });
    expect(link.getAttribute('href')).toBe('https://example.com/sop.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
    expect(within(withoutHref as HTMLElement).queryByRole('link')).toBeNull();
    expect(withoutHref.textContent).toContain('Sales Velocity Export.csv');
  });

  it('badges the chip with the file extension unless told otherwise', () => {
    const { container } = render(ContextCards, {
      props: { chunks: [CHUNKS[0], { ...CHUNKS[1], badge: 'XLS' }] },
    });
    const marks = [...container.querySelectorAll('.ripple-source-chip span[aria-hidden="true"]')].map(
      (m) => m.textContent?.trim()
    );
    expect(marks).toEqual(['PDF', 'XLS']);
  });
});

describe('ContextCards — a11y and motion', () => {
  it('labels the list by its header, with ids unique per instance', () => {
    const { container } = render(ContextCards, { props: { chunks: CHUNKS } });
    render(ContextCards, { props: { chunks: CHUNKS } });
    const lists = document.querySelectorAll('ul[aria-labelledby]');
    expect(lists).toHaveLength(2);
    const [a, b] = [...lists].map((l) => l.getAttribute('aria-labelledby'));
    expect(a).not.toBe(b);
    expect(container.querySelector(`#${CSS.escape(a!)}`)?.textContent).toContain('All chunks');
  });

  it('staggers cards through --i and names no scoped keyframe inline', () => {
    const { container } = render(ContextCards, { props: { chunks: CHUNKS } });
    const inline = [...container.querySelectorAll('[style]')].map((el) => el.getAttribute('style')).join(';');
    expect(container.querySelectorAll('li')[1].getAttribute('style')).toContain('--i: 1');
    expect(danglingKeyframes(source, inline)).toEqual([]);
  });
});
