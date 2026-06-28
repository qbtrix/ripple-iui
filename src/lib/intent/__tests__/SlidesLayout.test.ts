// SlidesLayout.test.ts — SP-4 deck-render proof.
// Created 2026-06-28.
//
// Renders a `{intent:'slides'}` spec through the real <Ripple> renderer (so this
// also proves the intent registration: normalizeSpec keeps `slides`,
// DESIGNED_INTENTS routes it to IntentRenderer, IntentRenderer dispatches to
// SlidesLayout). Asserts the deck shows the right number of slides, exactly one
// at a time, and that Next/Prev/dots/arrow-keys move the visible slide. Slide
// content uses unique tokens so "one at a time" is checked by content presence.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Ripple from '../../Ripple.svelte';
import type { UINode } from '../../schema/ui-spec.js';

const TOKENS = ['ALPHA_SLIDE', 'BRAVO_SLIDE', 'CHARLIE_SLIDE'];

function slide(text: string): UINode {
  return {
    type: 'container',
    children: [{ type: 'heading', props: { text, level: 2 } }]
  };
}

function deckSpec(tokens: string[] = TOKENS) {
  return {
    version: '2.0' as const,
    intent: 'slides' as const,
    title: 'Test Deck',
    ui: { type: 'container', children: tokens.map(slide) }
  };
}

const dots = (c: HTMLElement) => c.querySelectorAll('[data-slide-dot]');
const counter = (c: HTMLElement) => c.querySelector('[data-total]');
const nextBtn = (c: HTMLElement) => c.querySelector('button[aria-label="Next slide"]') as HTMLButtonElement;
const prevBtn = (c: HTMLElement) => c.querySelector('button[aria-label="Previous slide"]') as HTMLButtonElement;

describe('SlidesLayout — deck render (via Ripple)', () => {
  it('renders one dot per slide and a "1 / N" counter', () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    expect(dots(container)).toHaveLength(3);
    const c = counter(container)!;
    expect(c.getAttribute('data-total')).toBe('3');
    expect(c.textContent?.trim()).toBe('1 / 3');
  });

  it('shows exactly one slide at a time (only the active slide is in the DOM)', () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    expect(container.textContent).toContain('ALPHA_SLIDE');
    expect(container.textContent).not.toContain('BRAVO_SLIDE');
    expect(container.textContent).not.toContain('CHARLIE_SLIDE');
  });

  it('Next advances the visible slide and updates the counter', async () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    await fireEvent.click(nextBtn(container));
    expect(container.textContent).toContain('BRAVO_SLIDE');
    expect(container.textContent).not.toContain('ALPHA_SLIDE');
    expect(counter(container)!.textContent?.trim()).toBe('2 / 3');
  });

  it('Prev returns to the previous slide', async () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    await fireEvent.click(nextBtn(container)); // -> 2
    await fireEvent.click(prevBtn(container)); // -> 1
    expect(container.textContent).toContain('ALPHA_SLIDE');
    expect(container.textContent).not.toContain('BRAVO_SLIDE');
    expect(counter(container)!.textContent?.trim()).toBe('1 / 3');
  });

  it('disables Prev on the first slide and Next on the last', async () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    expect(prevBtn(container).disabled).toBe(true);
    expect(nextBtn(container).disabled).toBe(false);

    await fireEvent.click(nextBtn(container)); // -> 2
    await fireEvent.click(nextBtn(container)); // -> 3 (last)
    expect(container.textContent).toContain('CHARLIE_SLIDE');
    expect(nextBtn(container).disabled).toBe(true);
    expect(prevBtn(container).disabled).toBe(false);
  });

  it('clicking a dot jumps to that slide', async () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    await fireEvent.click(dots(container)[2] as HTMLElement);
    expect(container.textContent).toContain('CHARLIE_SLIDE');
    expect(counter(container)!.textContent?.trim()).toBe('3 / 3');
  });

  it('Right/Left arrow keys page the deck', async () => {
    const { container } = render(Ripple, { props: { spec: deckSpec() } });
    await fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.textContent).toContain('BRAVO_SLIDE');
    expect(counter(container)!.textContent?.trim()).toBe('2 / 3');

    await fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(container.textContent).toContain('ALPHA_SLIDE');
    expect(counter(container)!.textContent?.trim()).toBe('1 / 3');
  });

  it('renders a single-slide deck with no out-of-range navigation', () => {
    const { container } = render(Ripple, { props: { spec: deckSpec(['ONLY_SLIDE']) } });
    expect(dots(container)).toHaveLength(1);
    expect(counter(container)!.textContent?.trim()).toBe('1 / 1');
    expect(prevBtn(container).disabled).toBe(true);
    expect(nextBtn(container).disabled).toBe(true);
  });

  it('shows an empty state when the slides spec has no ui', () => {
    const { container } = render(Ripple, {
      props: { spec: { version: '2.0' as const, intent: 'slides' as const, title: 'Empty' } }
    });
    expect(container.textContent).toContain('No slides');
    expect(dots(container)).toHaveLength(0);
  });
});

describe('SlidesLayout — non-slides intents are unaffected', () => {
  it('a custom spec renders its raw tree with no deck chrome', () => {
    const spec = {
      version: '2.0' as const,
      intent: 'custom' as const,
      ui: { type: 'container', children: [{ type: 'heading', props: { text: 'PLAIN_CUSTOM', level: 2 } }] }
    };
    const { container } = render(Ripple, { props: { spec } });
    expect(container.textContent).toContain('PLAIN_CUSTOM');
    expect(dots(container)).toHaveLength(0);
    expect(counter(container)).toBeNull();
  });
});
