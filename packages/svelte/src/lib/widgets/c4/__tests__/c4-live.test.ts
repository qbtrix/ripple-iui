// c4-live.test.ts — the live layer of the C4 widget: explicit `kind`, the node
// decoration behind `status`/`selectedId`, the legend's status list, and the
// camera plan behind `focusId`/`follow`. Pure functions, no DOM.

import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/svelte';
import { getNodeType, computeElkLayout } from '../elk-layout.js';
import { decorateNodes, statusesPresent, nodeSetKey, planCamera } from '../live.js';
import type { C4Diagram, C4System, C4Component } from '$lib/widgets/c4/types.js';

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  type: 'system',
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});

describe('getNodeType with an explicit kind', () => {
  it('maps each kind to its node type', () => {
    expect(getNodeType({ id: 'p', name: 'P', kind: 'person', technology: 'x' } as C4System)).toBe('person');
    expect(getNodeType({ id: 's', name: 'S', kind: 'system' })).toBe('system');
    expect(getNodeType({ id: 'c', name: 'C', kind: 'container' })).toBe('container');
    expect(getNodeType({ id: 'k', name: 'K', kind: 'component', technology: 'Svelte' })).toBe('component');
    expect(getNodeType({ id: 'f', name: 'f.ts', kind: 'code' })).toBe('component');
  });

  it('keeps boundaries and database/queue shapes', () => {
    const boundary: C4System = { id: 'b', name: 'B', kind: 'container', containers: [{ id: 'x', name: 'X', kind: 'component' }] };
    expect(getNodeType(boundary)).toBe('group');
    expect(getNodeType({ id: 'd', name: 'D', kind: 'container', type: 'database' })).toBe('database');
  });

  it('leaves inference untouched without a kind', () => {
    const plain: C4Component = { id: 'auth', name: 'Auth', technology: 'Python', type: 'service' };
    expect(getNodeType(plain)).toBe('system');
    expect(getNodeType({ id: 'u', name: 'User' })).toBe('person');
  });

  it('nests code inside a component boundary through containers', async () => {
    const diagram: C4Diagram = {
      level: 'code',
      title: '',
      elements: [
        {
          id: 'ui', name: 'Editor parts', kind: 'component',
          containers: [
            { id: 'f1', name: 'CurveEditor.svelte', kind: 'code' },
            { id: 'f2', name: 'index.ts', kind: 'code' },
          ],
        },
      ],
      relationships: [],
    };
    const pos = await computeElkLayout(diagram);
    const box = pos.get('ui')!;
    for (const id of ['f1', 'f2']) {
      const p = pos.get(id)!;
      expect(p.x).toBeGreaterThanOrEqual(box.x);
      expect(p.y).toBeGreaterThan(box.y);
      expect(p.x + p.width).toBeLessThanOrEqual(box.x + box.width);
    }
  });
});

describe('decorateNodes', () => {
  const nodes = [node('a'), node('b', { selected: true }), node('c')];

  it('returns the very same nodes when no live input is given', () => {
    expect(decorateNodes(nodes, {})).toBe(nodes);
  });

  it('marks status on the wrapper and keeps untouched nodes by identity', () => {
    const out = decorateNodes(nodes, { status: { a: 'changing' } });
    expect(out[0].domAttributes).toEqual({ 'data-c4-status': 'changing' });
    expect(out[1]).toBe(nodes[1]);
    expect(out[2]).toBe(nodes[2]);
  });

  it('controls selection from selectedId', () => {
    const out = decorateNodes(nodes, { selectedId: 'c' });
    expect(out.map((n) => !!n.selected)).toEqual([false, false, true]);
    expect(out[0]).toBe(nodes[0]);
  });

  it('an empty selectedId string clears every selection', () => {
    const out = decorateNodes(nodes, { selectedId: '' });
    expect(out.some((n) => n.selected)).toBe(false);
  });
});

describe('statusesPresent', () => {
  it('lists the statuses on the given ids in legend order', () => {
    const status = { a: 'landed', b: 'failed', c: 'drift', z: 'changing' } as const;
    expect(statusesPresent(status, ['a', 'b', 'c'])).toEqual(['failed', 'drift', 'landed']);
    expect(statusesPresent(undefined, ['a'])).toEqual([]);
  });
});

describe('planCamera', () => {
  const ids = nodeSetKey([{ id: 'b' }, { id: 'a' }]);
  const other = nodeSetKey([{ id: 'x' }]);

  it('keys a node set independent of order', () => {
    expect(ids).toBe(nodeSetKey([{ id: 'a' }, { id: 'b' }]));
  });

  it('fits everything on the first layout without follow (the legacy fit)', () => {
    expect(planCamera(null, { ids })).toEqual({ nodeId: undefined, animate: false });
  });

  it('refits instantly when the node set changes, framing the focus when following', () => {
    expect(planCamera({ ids: other }, { ids, follow: true, focusId: 'a' })).toEqual({ nodeId: 'a', animate: false });
    expect(planCamera({ ids: other }, { ids, follow: false, focusId: 'a' })).toEqual({ nodeId: undefined, animate: false });
  });

  it('glides to a new focus within the same node set while following', () => {
    expect(planCamera({ ids, follow: true, focusId: 'a' }, { ids, follow: true, focusId: 'b' })).toEqual({ nodeId: 'b', animate: true });
  });

  it('stays put when nothing it follows changed, or follow is off', () => {
    expect(planCamera({ ids, follow: true, focusId: 'a' }, { ids, follow: true, focusId: 'a' })).toBeNull();
    expect(planCamera({ ids, follow: true, focusId: 'a' }, { ids, follow: false, focusId: 'b' })).toBeNull();
  });

  it('returns to the focus when follow turns back on', () => {
    expect(planCamera({ ids, follow: false, focusId: 'a' }, { ids, follow: true, focusId: 'a' })).toEqual({ nodeId: 'a', animate: true });
  });

  it('fits everything when the focus is not on this map', () => {
    expect(planCamera({ ids, follow: true, focusId: 'a' }, { ids, follow: true, focusId: 'zz' })).toEqual({ nodeId: undefined, animate: true });
  });
});
