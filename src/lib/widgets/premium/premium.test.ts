// src/lib/widgets/premium/premium.test.ts
// @description Render + catalog + provenance tests for the MIT-ported premium
//   pack. The provenance scan is a licensing gate: every premium .svelte file
//   MUST carry an @provenance note AND name the MIT license. Each premium
//   widget appends a describe block here (registered + one render assertion).
// @created 2026-05-30 — RFC 12 premium pack (Phase 4).
import { render } from '@testing-library/svelte';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { getWidgetTypes } from '$lib/widgets/index.js';
import type { UINode } from '$lib/schema/ui-spec.js';

const r = (ui: UINode) => render(Ripple, { props: { spec: { ui } } });

describe('premium provenance', () => {
  it('every premium .svelte file carries an MIT @provenance header', () => {
    const dir = resolve(__dirname);
    const files = readdirSync(dir).filter((f) => f.endsWith('.svelte'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(resolve(dir, f), 'utf-8');
      expect(src, `${f} missing @provenance`).toMatch(/@provenance/);
      expect(src, `${f} missing MIT`).toMatch(/MIT/);
    }
  });
});

describe('Marquee', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('marquee'); });
  it('renders its children twice (seamless loop)', () => {
    const { container } = r({ type: 'marquee', children: [{ type: 'text', props: { text: 'scrolls' } }] });
    // the loop duplicates the track for a seamless wrap
    expect(container.querySelectorAll('[data-marquee-track]').length).toBeGreaterThanOrEqual(2);
  });
});

describe('BorderBeam', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('border-beam'); });
  it('renders a [data-border-beam] element over its children', () => {
    const { container } = r({ type: 'border-beam', children: [{ type: 'text', props: { text: 'card body' } }] });
    expect(container.querySelector('[data-border-beam]')).not.toBeNull();
  });
});

describe('Shimmer', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('shimmer'); });
  it('renders a [data-shimmer] element wrapping its children', () => {
    const { container, getByText } = r({ type: 'shimmer', children: [{ type: 'text', props: { text: 'loading…' } }] });
    expect(container.querySelector('[data-shimmer]')).not.toBeNull();
    expect(getByText('loading…')).toBeTruthy();
  });
});

describe('AnimatedBeam', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('animated-beam'); });
  it('renders an <svg> beam', () => {
    const { container } = r({ type: 'animated-beam', props: { duration: 4 } });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('Aurora', () => {
  it('is registered (and aliased aurora-background)', () => {
    expect(getWidgetTypes()).toContain('aurora');
    expect(getWidgetTypes()).toContain('aurora-background');
  });
  it('renders a [data-aurora] backdrop behind its children', () => {
    const { container, getByText } = r({ type: 'aurora', children: [{ type: 'text', props: { text: 'hero copy' } }] });
    expect(container.querySelector('[data-aurora]')).not.toBeNull();
    expect(getByText('hero copy')).toBeTruthy();
  });
});

describe('Spotlight', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('spotlight'); });
  it('renders a [data-spotlight] element wrapping its children', () => {
    const { container, getByText } = r({ type: 'spotlight', children: [{ type: 'text', props: { text: 'follow me' } }] });
    expect(container.querySelector('[data-spotlight]')).not.toBeNull();
    expect(getByText('follow me')).toBeTruthy();
  });
});

describe('BentoGrid', () => {
  it('is registered (and aliased bento)', () => {
    expect(getWidgetTypes()).toContain('bento-grid');
    expect(getWidgetTypes()).toContain('bento');
  });
  it('renders each item title', () => {
    const { getByText } = r({ type: 'bento-grid', props: { items: [
      { title: 'Fast', description: 'Edge-deployed.' },
      { title: 'Branded', span: 2 },
    ] } });
    expect(getByText('Fast')).toBeTruthy();
    expect(getByText('Branded')).toBeTruthy();
  });
});
