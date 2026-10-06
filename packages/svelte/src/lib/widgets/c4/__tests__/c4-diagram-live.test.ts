// c4-diagram-live.test.ts — mounts the real C4Diagram (SvelteFlow + ELK) in
// jsdom and checks the live props reach the DOM: status rings on the node
// wrappers, the status legend, marker dots, controlled selection, the
// zoom-button report, the kind labels, and an untouched legacy render.

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/svelte';
import C4Diagram from '../C4Diagram.svelte';
import type { C4Diagram as C4DiagramData } from '$lib/widgets/c4/types.js';

const diagram: C4DiagramData = {
  level: 'code',
  title: '',
  elements: [
    {
      id: 'ui',
      name: 'Editor parts',
      kind: 'component',
      technology: 'Svelte 5',
      containers: [
        { id: 'f.curve', name: 'CurveEditor.svelte', kind: 'code', technology: 'new file' },
        { id: 'f.index', name: 'index.ts', kind: 'code', technology: '64 lines' },
      ],
    },
  ],
  relationships: [],
};

const legacy: C4DiagramData = {
  level: 'context',
  title: 'Banking',
  elements: [
    { id: 'user', name: 'User', description: 'A customer' },
    { id: 'bank', name: 'Bank', technology: 'COBOL', external: true },
  ],
  relationships: [{ from: 'user', to: 'bank', label: 'Uses' }],
};

function wrapper(container: HTMLElement, id: string) {
  return container.querySelector(`.svelte-flow__node[data-id="${id}"]`);
}

describe('C4Diagram live props', () => {
  it('paints status on the node wrappers and lists it in the legend', async () => {
    const { container, getByText } = render(C4Diagram, {
      diagram,
      status: { 'f.curve': 'changing', ui: 'drift' },
    });
    await waitFor(() => expect(wrapper(container, 'f.curve')).not.toBeNull());
    expect(wrapper(container, 'f.curve')?.getAttribute('data-c4-status')).toBe('changing');
    expect(wrapper(container, 'ui')?.getAttribute('data-c4-status')).toBe('drift');
    expect(wrapper(container, 'f.index')?.hasAttribute('data-c4-status')).toBe(false);
    expect(getByText('Changing now')).toBeInTheDocument();
    expect(getByText('Drift')).toBeInTheDocument();
  });

  it('draws marker dots on the nodes they name, skipping ids not on the map', async () => {
    const { container, findByLabelText, queryByLabelText } = render(C4Diagram, {
      diagram,
      markers: {
        'f.curve': [{ id: 'dev', label: 'dev·ripple', color: 'var(--ripple-accent)' }],
        elsewhere: [{ id: 'rev', label: 'Reviewer', color: 'var(--ripple-info)' }],
      },
    });
    await waitFor(() => expect(wrapper(container, 'f.curve')).not.toBeNull());
    const dot = await findByLabelText('dev·ripple');
    expect(dot.closest('.svelte-flow__node-toolbar')?.getAttribute('data-id')).toBe('f.curve');
    expect(queryByLabelText('Reviewer')).toBeNull();
  });

  it('controls selection from selectedId', async () => {
    const { container, rerender } = render(C4Diagram, { diagram, selectedId: 'f.index' });
    await waitFor(() => expect(wrapper(container, 'f.index')?.classList.contains('selected')).toBe(true));
    expect(wrapper(container, 'f.curve')?.classList.contains('selected')).toBe(false);
    await rerender({ diagram, selectedId: 'f.curve' });
    await waitFor(() => expect(wrapper(container, 'f.curve')?.classList.contains('selected')).toBe(true));
    expect(wrapper(container, 'f.index')?.classList.contains('selected')).toBe(false);
  });

  it('reports a zoom-button press as a manual camera move', async () => {
    const onmanualcamera = vi.fn();
    const { container } = render(C4Diagram, { diagram, follow: true, focusId: 'f.curve', onmanualcamera });
    await waitFor(() => expect(container.querySelector('.svelte-flow__controls button')).not.toBeNull());
    await fireEvent.click(container.querySelector('.svelte-flow__controls button')!);
    expect(onmanualcamera).toHaveBeenCalledTimes(1);
  });

  it('labels a kind: component boundary and code nodes', async () => {
    const { container, getAllByText } = render(C4Diagram, { diagram });
    await waitFor(() => expect(wrapper(container, 'ui')).not.toBeNull());
    expect(container.querySelector('.group-type')?.textContent).toBe('Component');
    expect(getAllByText('Code')).toHaveLength(2);
    expect(container.querySelector('.c4-header')).toBeNull();
  });

  it('routes a drillable component click to ondrilldown', async () => {
    const ondrilldown = vi.fn();
    const onclick = vi.fn();
    const drill: C4DiagramData = {
      level: 'component',
      title: '',
      elements: [{ id: 'craft', name: 'Craft Studio', kind: 'component', technology: 'Svelte 5', drillable: true }],
      relationships: [],
    };
    const { container } = render(C4Diagram, { diagram: drill, onclick, ondrilldown });
    await waitFor(() => expect(container.querySelector('.c4-component-node')).not.toBeNull());
    expect(container.querySelector('.c4-component-node .c4-node-drill')).not.toBeNull();
    await fireEvent.click(container.querySelector('.c4-component-node')!);
    expect(ondrilldown).toHaveBeenCalledWith('craft', 'code');
    expect(onclick).not.toHaveBeenCalled();
  });

  it('renders a legacy diagram as before: header, shape legend, no live attributes', async () => {
    const { container, getByText } = render(C4Diagram, { diagram: legacy });
    await waitFor(() => expect(wrapper(container, 'user')).not.toBeNull());
    expect(getByText('Banking')).toBeInTheDocument();
    expect(getByText('Person')).toBeInTheDocument();
    expect(container.querySelector('[data-c4-status]')).toBeNull();
    expect(container.querySelector('.svelte-flow__node-toolbar')).toBeNull();
    expect(wrapper(container, 'user')?.classList.contains('svelte-flow__node-person')).toBe(true);
  });
});
