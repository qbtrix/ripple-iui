// c4-diagram-semantic.test.ts — mounts C4Diagram in semantic zoom (the `expanded` prop) and checks
// the expansion state reaches the DOM: boundaries nest their children in place, the scope ghosts
// its outside, a code element opens as a panel with true line numbers and its change tinted, the
// Before/After switch works, the scope lists far connections as chips, markers roll up, `planned`
// and the scope ghost stay independent, keyboard activation does what a click does (a click when
// the host has no ondrilldown), an element that opens swaps its view inside one node wrapper, a click
// selects when selection is uncontrolled (SvelteFlow's write comes back through the nodes binding),
// and a repeated id shows the error state rather than hanging.

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/svelte';
import C4Diagram from '../C4Diagram.svelte';
import type { C4Diagram as C4DiagramData } from '$lib/widgets/c4/types.js';

const diagram: C4DiagramData = {
  level: 'context',
  title: '',
  elements: [
    {
      id: 'pe', name: 'Paw Enterprise', kind: 'system',
      children: [{ id: 'pe.spa', name: 'SPA', kind: 'container', children: [{ id: 'craft', name: 'Craft Studio', kind: 'component' }] }],
    },
    {
      id: 'rp', name: 'Ripple', kind: 'system',
      children: [
        {
          id: 'rp.svelte', name: '@ripple-ui/svelte', kind: 'container',
          children: [
            {
              id: 'ui', name: 'Editor parts', kind: 'component',
              children: [
                {
                  id: 'f.inspector', name: 'PhotoInspector.svelte', kind: 'code', technology: 'Svelte',
                  code: {
                    startLine: 185,
                    before: Array.from({ length: 13 }, (_, i) => `old ${185 + i}`),
                    changed: [192, 197],
                    after: Array.from({ length: 6 }, (_, i) => `new ${192 + i}`),
                  },
                },
                { id: 'f.index', name: 'index.ts', kind: 'code' },
              ],
            },
          ],
        },
        { id: 'rp.core', name: '@ripple-ui/core', kind: 'container' },
      ],
    },
  ],
  relationships: [{ from: 'craft', to: 'ui', label: 'uses parts' }],
};

const DEEP = ['rp', 'rp.svelte', 'ui', 'f.inspector'];
const wrapper = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`.svelte-flow__node[data-id="${id}"]`);

// Each case mounts SvelteFlow and runs ELK; on a loaded machine that outlasts vitest's 5s default.
describe('C4Diagram semantic zoom', { timeout: 30000 }, () => {
  it('draws only the top level as cards when nothing is expanded', async () => {
    const { container } = render(C4Diagram, { diagram, expanded: [] });
    await waitFor(() => expect(wrapper(container, 'rp')).not.toBeNull());
    expect(wrapper(container, 'rp')?.classList.contains('svelte-flow__node-system')).toBe(true);
    expect(wrapper(container, 'rp.svelte')).toBeNull();
    expect(container.querySelector('.c4-canvas')?.classList.contains('c4-semantic')).toBe(true);
  });

  it('opens each expanded element in place and ghosts what lies outside the scope', async () => {
    const { container } = render(C4Diagram, { diagram, expanded: DEEP, scopeId: 'ui' });
    await waitFor(() => expect(wrapper(container, 'f.index')).not.toBeNull());
    for (const id of ['rp', 'rp.svelte', 'ui']) expect(wrapper(container, id)?.classList.contains('svelte-flow__node-group')).toBe(true);
    expect(wrapper(container, 'pe')?.hasAttribute('data-c4-ghost')).toBe(true);
    expect(wrapper(container, 'rp.core')?.hasAttribute('data-c4-ghost')).toBe(true);
    expect(wrapper(container, 'rp')?.hasAttribute('data-c4-ghost')).toBe(false);
    expect(wrapper(container, 'f.index')?.hasAttribute('data-c4-ghost')).toBe(false);
  });

  it('opens a code element as a panel with true line numbers and the change tinted', async () => {
    const { container, getByRole } = render(C4Diagram, { diagram, expanded: DEEP, scopeId: 'ui' });
    await waitFor(() => expect(container.querySelector('.c4-code-node')).not.toBeNull());
    const panel = wrapper(container, 'f.inspector')!;
    expect(panel.classList.contains('svelte-flow__node-code')).toBe(true);
    const numbers = [...panel.querySelectorAll('code')].map((c) => c.parentElement?.querySelector('.select-none')?.textContent);
    expect(numbers[0]).toBe('185');
    expect(numbers.at(-1)).toBe('197');
    const tinted = [...panel.querySelectorAll('[data-highlight="added"] .select-none')].map((n) => n.textContent);
    expect(tinted).toEqual(['192', '193', '194', '195', '196', '197']);
    expect(panel.textContent).toContain('new 192');

    await fireEvent.click(getByRole('radio', { name: 'Before' }));
    await waitFor(() => expect(panel.textContent).toContain('old 192'));
    expect(panel.querySelectorAll('[data-highlight="removed"]')).toHaveLength(6);
  });

  it('lists a crossing drawn further out as a chip on the scope', async () => {
    const { container } = render(C4Diagram, { diagram, expanded: DEEP, scopeId: 'ui' });
    await waitFor(() => expect(wrapper(container, 'ui')).not.toBeNull());
    expect(wrapper(container, 'ui')?.querySelector('.c4-port')?.textContent?.trim()).toBe('← Paw Enterprise · 1');
  });

  it('rolls a marker on a hidden element up to its drawn ancestor', async () => {
    const dot = { id: 'dev', label: 'dev·ripple', color: 'red' };
    const { container, findByLabelText } = render(C4Diagram, { diagram, expanded: [], markers: { 'f.inspector': [dot] } });
    await waitFor(() => expect(wrapper(container, 'rp')).not.toBeNull());
    const marker = await findByLabelText('dev·ripple');
    expect(marker.closest('.svelte-flow__node-toolbar')?.getAttribute('data-id')).toBe('rp');
  });

  it('keeps planned and the scope ghost independent on the same node', async () => {
    const { container } = render(C4Diagram, {
      diagram,
      expanded: DEEP,
      scopeId: 'ui',
      status: { pe: 'planned', 'f.index': 'planned', 'rp.core': 'landed' },
    });
    await waitFor(() => expect(wrapper(container, 'f.index')).not.toBeNull());
    const attrs = (id: string) => [wrapper(container, id)?.getAttribute('data-c4-status'), wrapper(container, id)?.hasAttribute('data-c4-ghost')];
    // Outside the scope and planned: both treatments. Inside and planned: the status only.
    expect(attrs('pe')).toEqual(['planned', true]);
    expect(attrs('f.index')).toEqual(['planned', false]);
    expect(attrs('rp.core')).toEqual(['landed', true]);
  });

  it('runs on Enter and Space exactly what a click runs, for every drawn node', async () => {
    const onclick = vi.fn();
    const ondrilldown = vi.fn();
    const { container } = render(C4Diagram, { diagram, expanded: DEEP, scopeId: 'ui', onclick, ondrilldown });
    await waitFor(() => expect(container.querySelector('.c4-code-node')).not.toBeNull());
    const take = () => {
      const out = [...onclick.mock.calls.map((c) => ['click', ...c]), ...ondrilldown.mock.calls.map((c) => ['drill', ...c])];
      onclick.mockClear();
      ondrilldown.mockClear();
      return out;
    };
    const ids = ['pe', 'rp', 'rp.svelte', 'ui', 'f.inspector', 'f.index', 'rp.core'];
    const byClick: Record<string, unknown[]> = {};
    for (const id of ids) {
      const w = wrapper(container, id)!;
      await fireEvent.click(w.querySelector('.c4-node, .group-label, .c4-code-node')!);
      byClick[id] = take();
      await fireEvent.keyDown(w, { key: 'Enter' });
      expect(take(), `${id} Enter`).toEqual(byClick[id]);
      await fireEvent.keyDown(w, { key: ' ' });
      expect(take(), `${id} Space`).toEqual(byClick[id]);
    }
    // Open boundaries and the code panel click; a closed card with children drills.
    expect(byClick).toEqual({
      pe: [['drill', 'pe', 'container']],
      rp: [['click', 'rp']],
      'rp.svelte': [['click', 'rp.svelte']],
      ui: [['click', 'ui']],
      'f.inspector': [['click', 'f.inspector']],
      'f.index': [['click', 'f.index']],
      'rp.core': [['click', 'rp.core']],
    });
  });

  it('falls back to onclick on a drillable card when the host has no ondrilldown', async () => {
    const onclick = vi.fn();
    const { container } = render(C4Diagram, { diagram, expanded: [], onclick });
    await waitFor(() => expect(wrapper(container, 'pe')).not.toBeNull());
    const w = wrapper(container, 'pe')!;
    await fireEvent.click(w.querySelector('.c4-node')!);
    await fireEvent.keyDown(w, { key: 'Enter' });
    await fireEvent.keyDown(w, { key: ' ' });
    expect(onclick.mock.calls).toEqual([['pe'], ['pe'], ['pe']]);
  });

  it('opens an element inside the same node wrapper, swapping its view', async () => {
    const { container, rerender } = render(C4Diagram, { diagram, expanded: [] });
    await waitFor(() => expect(wrapper(container, 'rp')).not.toBeNull());
    const before = wrapper(container, 'rp')!;
    expect([...before.classList]).toEqual(expect.arrayContaining(['svelte-flow__node-c4', 'svelte-flow__node-system']));
    await rerender({ diagram, expanded: ['rp'] });
    await waitFor(() => expect(wrapper(container, 'rp.svelte')).not.toBeNull());
    expect(wrapper(container, 'rp')).toBe(before);
    expect([...before.classList]).toEqual(expect.arrayContaining(['svelte-flow__node-c4', 'svelte-flow__node-group']));
    expect(before.classList.contains('svelte-flow__node-system')).toBe(false);
  });

  it('selects a clicked node when selection is uncontrolled', async () => {
    const { container } = render(C4Diagram, { diagram, expanded: [] });
    await waitFor(() => expect(wrapper(container, 'rp')).not.toBeNull());
    await fireEvent.click(wrapper(container, 'rp')!);
    await waitFor(() => expect(wrapper(container, 'rp')?.classList.contains('selected')).toBe(true));
    await fireEvent.click(wrapper(container, 'pe')!);
    await waitFor(() => expect(wrapper(container, 'pe')?.classList.contains('selected')).toBe(true));
    expect(wrapper(container, 'rp')?.classList.contains('selected')).toBe(false);
  });

  it('shows the error state for an id used twice instead of hanging', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dup: C4DiagramData = {
      level: 'context',
      title: '',
      elements: [
        { id: 'api', name: 'API', kind: 'system', children: [{ id: 'api', name: 'API', kind: 'container' }] },
        { id: 'web', name: 'Web', kind: 'system' },
      ],
      relationships: [{ from: 'web', to: 'api' }],
    };
    const { findByRole } = render(C4Diagram, { diagram: dup, expanded: [] });
    expect((await findByRole('alert')).textContent).toContain('Diagram layout failed');
    quiet.mockRestore();
  });
});
