// widget-id-forwarding.test.ts
// Created 2026-06-27 — DOM-id coverage guard for the SP-0 id-forwarding codemod.
//
// NodeRenderer passes `id: node.id` into every widget's props, but a node id only
// becomes addressable by the visual editor when the widget binds it on its root
// element. Before this codemod these 19 widgets received `id` but never bound it,
// so they were selectable only via select-parent (the non-forwarding ~15%; global
// baseline was ~85% per SP-0). The codemod binds `id` + `data-ripple-node` on each
// widget's root. This test renders each touched widget and asserts its spec node id
// surfaces as a real DOM element `id` (and `data-ripple-node`), proving the set went
// from 0% → 100% DOM-id coverage.

import { render, cleanup } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

// jsdom has no ResizeObserver; the Chart widget constructs one in onMount. A no-op
// stub lets it mount (the observer callback never fires in jsdom, so echarts is
// never dynamically imported here).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => cleanup());

interface Target {
  type: string;
  id: string;
  props: Record<string, unknown>;
}

// One entry per widget the codemod touched. Props are the minimum needed for the
// widget to render its root element (e.g. Badge hides itself when `text` is empty).
const TARGETS: Target[] = [
  { type: 'badge', id: 'n-badge', props: { text: 'Live' } },
  { type: 'metric', id: 'n-metric', props: { label: 'Revenue', value: '42' } },
  { type: 'progress', id: 'n-progress', props: { value: 50, max: 100 } },
  { type: 'soul-status', id: 'n-soul-status', props: { name: 'Aria' } },
  { type: 'table', id: 'n-table', props: { data: [{ name: 'A' }], columns: ['name'] } },
  { type: 'chart', id: 'n-chart', props: { data: [{ label: 'Q1', value: 10 }] } },
  { type: 'source-card', id: 'n-source-card', props: { source: 'NYT', title: 'Title' } },
  { type: 'citation', id: 'n-citation', props: { source: 'NYT' } },
  { type: 'sources-bar', id: 'n-sources-bar', props: { sources: [{ name: 'NYT' }] } },
  { type: 'discover-card', id: 'n-discover-card', props: { title: 'Discover' } },
  { type: 'follow-up', id: 'n-follow-up', props: {} },
  { type: 'company-header', id: 'n-company-header', props: { name: 'Acme' } },
  { type: 'ticker', id: 'n-ticker', props: { items: [{ symbol: 'ACME', price: '10', change: '+1' }] } },
  { type: 'kv-table', id: 'n-kv-table', props: { rows: [{ key: 'K', value: 'V' }] } },
  { type: 'timeline', id: 'n-timeline', props: { events: [{ date: 'Today', title: 'Launch' }] } },
  { type: 'callout', id: 'n-callout', props: { text: 'Heads up' } },
  { type: 'news-card', id: 'n-news-card', props: { headline: 'Story', source: 'NYT' } },
  { type: 'analyst-bar', id: 'n-analyst-bar', props: { buy: 3, hold: 1, sell: 1 } },
  { type: 'range-bar', id: 'n-range-bar', props: { min: 0, max: 100, current: 50 } },
];

/** Render a single widget as the spec root and return its render container. */
function renderWidget(t: Target) {
  return render(Ripple, {
    props: { spec: { state: {}, ui: { type: t.type, id: t.id, props: t.props } } },
  });
}

test('codemod set: DOM-id coverage is 100% (was 0% for this non-forwarding set)', () => {
  const found: string[] = [];
  const missing: string[] = [];

  for (const t of TARGETS) {
    const { container, unmount } = renderWidget(t);
    const surfaced = container.querySelector(`[id="${t.id}"]`) !== null;
    (surfaced ? found : missing).push(t.id);
    unmount();
  }

  const coverage = found.length / TARGETS.length;
  // eslint-disable-next-line no-console
  console.log(
    `[id-forwarding] DOM-id coverage for the codemod set: ` +
      `BEFORE 0/${TARGETS.length} (0% — these were the non-forwarding ~15%; global baseline ~85% per SP-0) ` +
      `→ AFTER ${found.length}/${TARGETS.length} (${(coverage * 100).toFixed(0)}%)` +
      (missing.length ? ` | still missing: ${missing.join(', ')}` : ''),
  );

  expect(missing).toEqual([]);
  expect(coverage).toBe(1);
});

test.each(TARGETS)(
  'widget "$type" surfaces its node id + data-ripple-node on its root',
  (t) => {
    const { container } = renderWidget(t);
    expect(
      container.querySelector(`[id="${t.id}"]`),
      `${t.type} should bind id={id} on its root`,
    ).not.toBeNull();
    expect(
      container.querySelector(`[data-ripple-node="${t.id}"]`),
      `${t.type} should bind data-ripple-node={id} on its root`,
    ).not.toBeNull();
  },
);
