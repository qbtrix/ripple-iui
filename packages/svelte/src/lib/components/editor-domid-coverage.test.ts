// editor-domid-coverage.test.ts
// @description SP-0 editor spike — empirically measures how many rendered spec
//   nodes can be mapped back to their spec node from the DOM, for the two
//   candidate selectors:
//     (1) data-ripple-node  — the dedicated attribute the spike stamps into
//         widgetProps + the motion wrapper.
//     (2) the DOM `id`      — already bound by ~82% of widget roots (`<div {id}>`).
//   Renders one representative spec spanning atoms / molecules / organisms /
//   composites, then computes coverage = (#node-ids found in DOM) / (#node-ids),
//   and prints the exact percentages plus the list of widget TYPES whose id did
//   not surface (the fallback set). It is the ground-truth evidence for the
//   GO / GO-WITH-FALLBACK / REDESIGN decision in docs/design/sp0-spike-report.md.
// @created 2026-06-27
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import type { UINode } from '@ripple-ui/core';

// ---------------------------------------------------------------------------
// Representative spec. Every node carries an explicit, unique `n_xxxxxxxx` id
// so the denominator is fully controlled. Spans the four tiers + 5 composites.
// jsdom-hostile widgets (echarts Chart, leaflet Map, muuri Kanban, canvas) are
// deliberately excluded — they don't render in jsdom and would muddy the count.
// ---------------------------------------------------------------------------
const spec = {
  ui: {
    type: 'container',
    id: 'n_root0001',
    children: [
      // ---- organism: navbar ----
      { type: 'navbar', id: 'n_navbar01', props: { brand: 'Acme' } },

      // ---- atoms ----
      { type: 'heading', id: 'n_head0001', props: { text: 'Dashboard' } },
      { type: 'text', id: 'n_text0001', props: { text: 'Welcome back.' } },
      { type: 'button', id: 'n_button01', props: { label: 'Save' } },
      { type: 'input', id: 'n_input001', props: { placeholder: 'Email' } },
      { type: 'badge', id: 'n_badge001', props: { text: 'New' } },

      // ---- molecules ----
      { type: 'card', id: 'n_card0001', props: { title: 'Revenue' } },
      { type: 'stat', id: 'n_stat0001', props: { label: 'MRR', value: '$12k' } },
      { type: 'metric', id: 'n_metric01', props: { label: 'Users', value: 1280 } },

      // ---- motion-wrapped molecule (exercises the motion-wrapper stamp) ----
      {
        type: 'card',
        id: 'n_motion01',
        props: { title: 'Animated' },
        motion: { enter: { opacity: 0 } },
      },

      // ---- organisms ----
      { type: 'table', id: 'n_table001', props: { columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] } },
      { type: 'data-grid', id: 'n_grid0001', props: { columns: [{ id: 'a', label: 'A' }], rows: [{ a: 1 }] } },
      {
        type: 'form',
        id: 'n_form0001',
        children: [
          // ---- molecule: a form field nested in the organism ----
          { type: 'input', id: 'n_finput01', props: { placeholder: 'Name' } },
        ],
      },

      // ---- composites (>= 3 required) ----
      { type: 'master-detail', id: 'n_master01', props: { items: [{ id: '1', title: 'Row 1' }] } },
      { type: 'entity-detail', id: 'n_entity01', props: { title: 'Acme Corp' } },
      { type: 'exec-dashboard', id: 'n_execdsh1', props: { metrics: [{ label: 'NPS', value: 72 }] } },
      { type: 'form-layout', id: 'n_formlay1', props: { title: 'Sign up' } },
      { type: 'report-layout', id: 'n_report01', props: { title: 'Q3 Report' } },
    ],
  },
};

interface NodeRef {
  id: string;
  type: string;
}

function collectNodes(node: UINode, out: NodeRef[] = []): NodeRef[] {
  if (node && typeof node === 'object') {
    if (node.id) out.push({ id: node.id, type: String((node as { type?: unknown }).type ?? 'unknown') });
    for (const key of ['children', 'else_children'] as const) {
      const kids = (node as Record<string, unknown>)[key];
      if (Array.isArray(kids)) for (const k of kids) collectNodes(k as UINode, out);
    }
  }
  return out;
}

describe('SP-0: per-node DOM addressability coverage', () => {
  it('measures data-ripple-node vs DOM-id coverage across all tiers', () => {
    const { container } = render(Ripple, { props: { spec } });

    const nodes = collectNodes(spec.ui as UINode);
    const total = nodes.length;

    const dataNodeHits: NodeRef[] = [];
    const dataNodeMiss: NodeRef[] = [];
    const idHits: NodeRef[] = [];
    const idMiss: NodeRef[] = [];

    for (const n of nodes) {
      const byDataAttr = container.querySelector(`[data-ripple-node="${n.id}"]`);
      (byDataAttr ? dataNodeHits : dataNodeMiss).push(n);
      const byId = container.querySelector(`[id="${n.id}"]`);
      (byId ? idHits : idMiss).push(n);
    }

    const pct = (h: number) => `${((h / total) * 100).toFixed(1)}%`;
    const types = (arr: NodeRef[]) => [...new Set(arr.map((n) => n.type))].sort();

    // The report consumes this block verbatim.
    /* eslint-disable no-console */
    console.log('\n================ SP-0 COVERAGE ================');
    console.log(`total spec nodes (with id): ${total}`);
    console.log(`data-ripple-node coverage : ${dataNodeHits.length}/${total} = ${pct(dataNodeHits.length)}`);
    console.log(`   forwarded types        : ${JSON.stringify(types(dataNodeHits))}`);
    console.log(`   NON-forwarding types   : ${JSON.stringify(types(dataNodeMiss))}`);
    console.log(`DOM id coverage           : ${idHits.length}/${total} = ${pct(idHits.length)}`);
    console.log(`   forwarded types        : ${JSON.stringify(types(idHits))}`);
    console.log(`   NON-forwarding types   : ${JSON.stringify(types(idMiss))}`);
    console.log('===============================================\n');
    /* eslint-enable no-console */

    // --- Findings, asserted so a green test == proven conclusion ---

    // Representative sample is non-trivial.
    expect(total).toBeGreaterThanOrEqual(18);

    // FINDING 1: the DOM `id` is the working selector — it reaches the majority
    // of widget roots today with zero widget changes.
    expect(idHits.length / total).toBeGreaterThanOrEqual(0.7);

    // FINDING 2: the dedicated data-ripple-node attribute, stamped into
    // widgetProps, does NOT reach id-parity, because no widget spreads unknown
    // attributes onto its root. It only lands where the renderer itself owns a
    // wrapper element (the motion wrapper).
    expect(dataNodeHits.length).toBeLessThan(idHits.length);

    // FINDING 3: the motion-wrapper stamp works — a motion-wrapped node IS
    // addressable via data-ripple-node (on the wrapper div).
    expect(container.querySelector('[data-ripple-node="n_motion01"]')).not.toBeNull();

    // FINDING 4 (updated after the #79 widget-id-forwarding codemod): the former
    // non-forwarders (badge / metric / table) now bind their id on root, so they
    // are directly addressable rather than select-parent fallbacks. This locks in
    // the codemod's effect — a regression that drops id from these roots fails here.
    const idHitTypes = new Set(idHits.map((n) => n.type));
    expect(idHitTypes.has('badge')).toBe(true);
    expect(idHitTypes.has('metric')).toBe(true);
    expect(idHitTypes.has('table')).toBe(true);
  });
});
