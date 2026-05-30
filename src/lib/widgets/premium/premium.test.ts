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
