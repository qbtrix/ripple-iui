// c4-live.test.ts — the live layer of the C4 widget: explicit `kind`, the node
// decoration behind `status`/`selectedId`, the legend's status list, the
// camera plan behind `focusId`/`follow`, and ELK's edge routes with the
// rounded path drawn through them. Pure functions, no DOM.

import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/svelte';
import { getNodeType, computeElkLayout, computeElkGraph } from '../elk-layout.js';
import { decorateNodes, statusesPresent, nodeSetKey, planCamera, roundedPath, STATUS_LABELS } from '../live.js';
import type { C4Diagram, C4System, C4Component } from '$lib/widgets/c4/types.js';

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  type: 'system',
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});

// Runs ELK; on a loaded machine that outlasts vitest's 5s default.
describe('getNodeType with an explicit kind', { timeout: 30000 }, () => {
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

  it('lists planned last, with its own label', () => {
    const status = { a: 'planned', b: 'landed', c: 'failed' } as const;
    expect(statusesPresent(status, ['a', 'b', 'c'])).toEqual(['failed', 'landed', 'planned']);
    expect(STATUS_LABELS.planned).toBe('Planned');
    expect(decorateNodes([node('a')], { status }).at(0)?.domAttributes).toEqual({ 'data-c4-status': 'planned' });
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

describe('computeElkGraph routes', { timeout: 30000 }, () => {
  const diagram: C4Diagram = {
    level: 'component',
    title: '',
    elements: [
      {
        id: 'spa', name: 'SPA', kind: 'container',
        containers: [
          { id: 'craft', name: 'Craft', kind: 'component' },
          { id: 'stores', name: 'Stores', kind: 'component' },
        ],
      },
      { id: 'ui', name: 'Editor parts', kind: 'component', external: true },
    ],
    relationships: [
      { from: 'craft', to: 'ghost', label: 'dropped: unknown end' },
      { from: 'craft', to: 'stores', label: 'session state' },
      { from: 'craft', to: 'ui', label: 'uses parts' },
    ],
  };

  it('keys routes by relationship index and starts/ends them on the node boxes', async () => {
    const { positions, routes } = await computeElkGraph(diagram);
    expect(routes.has(0)).toBe(false);
    for (const [i, from, to] of [[1, 'craft', 'stores'], [2, 'craft', 'ui']] as const) {
      const route = routes.get(i)!;
      const [a, b] = [positions.get(from)!, positions.get(to)!];
      const start = route.points[0];
      const end = route.points.at(-1)!;
      // absolute coordinates: on the source box's border, and on the target's
      expect(start.x).toBeGreaterThanOrEqual(a.x - 0.5);
      expect(start.x).toBeLessThanOrEqual(a.x + a.width + 0.5);
      expect([a.y, a.y + a.height].some((y) => Math.abs(start.y - y) < 0.5) || [a.x, a.x + a.width].some((x) => Math.abs(start.x - x) < 0.5)).toBe(true);
      expect([b.y, b.y + b.height].some((y) => Math.abs(end.y - y) < 0.5) || [b.x, b.x + b.width].some((x) => Math.abs(end.x - x) < 0.5)).toBe(true);
      expect(route.label?.width).toBeGreaterThan(0);
    }
  });

  it('keeps computeElkLayout returning the positions map', async () => {
    const pos = await computeElkLayout(diagram);
    expect([...pos.keys()].sort()).toEqual(['craft', 'spa', 'stores', 'ui']);
  });
});

describe('roundedPath', () => {
  it('draws straight runs and rounds each corner', () => {
    expect(roundedPath([], 8)).toBe('');
    expect(roundedPath([{ x: 0, y: 0 }, { x: 0, y: 50 }], 8)).toBe('M 0 0 L 0 50');
    expect(roundedPath([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 40, y: 50 }], 8)).toBe('M 0 0 L 0 42 Q 0 50 8 50 L 40 50');
  });

  it('shrinks the radius on a short jog', () => {
    expect(roundedPath([{ x: 0, y: 0 }, { x: 0, y: 6 }, { x: 30, y: 6 }], 8)).toBe('M 0 0 L 0 3 Q 0 6 3 6 L 30 6');
  });
});
