// c4-diagram-camera.test.ts — the semantic camera moves once per layout: when the diagram and the
// focus change together (a live run's new file), it holds until the new layout lands instead of
// first aiming at where the focus's ancestor sat in the old one. SvelteFlow's setViewport is spied
// through a partial mock of @xyflow/svelte; everything else is the real SvelteFlow and ELK.

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import C4Diagram from '../C4Diagram.svelte';
import type { C4Diagram as C4DiagramData, C4Element } from '$lib/widgets/c4/types.js';

const setViewport = vi.fn();
vi.mock('@xyflow/svelte', async (importOriginal) => {
  const xy = await importOriginal<typeof import('@xyflow/svelte')>();
  return {
    ...xy,
    useSvelteFlow: () => {
      const flow = xy.useSvelteFlow();
      return new Proxy(flow, {
        get: (target, key, receiver) =>
          key === 'setViewport'
            ? (...args: Parameters<typeof flow.setViewport>) => {
                setViewport(...args);
                return target.setViewport(...args);
              }
            : Reflect.get(target, key, receiver),
      });
    },
  };
});

const component = (id: string, files: string[]): C4Element => ({
  id,
  name: id,
  kind: 'component',
  children: files.map((f) => ({ id: f, name: f, kind: 'code' as const })),
});
const app = (files: Record<string, string[]>): C4DiagramData => ({
  level: 'context',
  title: '',
  elements: [{ id: 'app', name: 'App', kind: 'container', children: Object.entries(files).map(([id, f]) => component(id, f)) }],
  relationships: [],
});

describe('C4Diagram semantic camera', { timeout: 30000 }, () => {
  it('holds while a new layout computes, then moves once', async () => {
    const before = app({ a: ['a/1.ts'], b: ['b/1.ts'] });
    const { container, rerender } = render(C4Diagram, {
      diagram: before, expanded: ['app', 'a'], follow: true, focusId: 'a/1.ts',
    });
    await waitFor(() => expect(setViewport).toHaveBeenCalled());
    setViewport.mockClear();

    // A new file under b, and the focus on it: b opens, a closes.
    await rerender({ diagram: app({ a: ['a/1.ts'], b: ['b/1.ts', 'b/2.ts'] }), expanded: ['app', 'b'], follow: true, focusId: 'b/2.ts' });
    await tick();
    expect(setViewport).not.toHaveBeenCalled();
    await waitFor(() => expect(container.querySelector('.svelte-flow__node[data-id="b/2.ts"]')).not.toBeNull());
    await waitFor(() => expect(setViewport).toHaveBeenCalledTimes(1));
  });
});
