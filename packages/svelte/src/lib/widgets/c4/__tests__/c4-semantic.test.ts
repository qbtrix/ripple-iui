// c4-semantic.test.ts — semantic zoom's pure core: what an `expanded` set draws (cards, boundaries,
// code panels), how relationships lift onto drawn siblings with counts, port badges and scope
// chips, which nodes are ghosted context, where markers roll up, what a code panel shows, and
// that an edge keeps its relationships' async/event dash in the semantic graph.

import { describe, it, expect } from 'vitest';
import type { C4Element, C4Relationship, C4Code } from '$lib/widgets/c4/types.js';
import { computeSemanticLayout } from '../elk-layout.js';
import { buildSemanticFlow } from '../semantic-flow.js';
import {
  codePanelSize,
  codeView,
  computeVisibility,
  ghostIds,
  indexTree,
  liftMarkers,
  liftRelationships,
  representative,
} from '../semantic.js';

const INSPECTOR: C4Code = {
  startLine: 185,
  before: Array.from({ length: 13 }, (_, i) => `old ${185 + i}`),
  changed: [192, 197],
  after: Array.from({ length: 6 }, (_, i) => `new ${192 + i}`),
};

const elements: C4Element[] = [
  { id: 'captain', name: 'Captain', kind: 'person' },
  {
    id: 'pe', name: 'Paw Enterprise', kind: 'system',
    children: [
      {
        id: 'pe.spa', name: 'SPA', kind: 'container',
        children: [
          {
            id: 'craft', name: 'Craft Studio', kind: 'component',
            children: [
              { id: 'f.inspector', name: 'PhotoInspector.svelte', kind: 'code', code: INSPECTOR },
              { id: 'f.session', name: 'photo-session.ts', kind: 'code' },
            ],
          },
          { id: 'stores', name: 'Stores', kind: 'component' },
        ],
      },
      { id: 'pe.worker', name: 'Craft engine worker', kind: 'container' },
    ],
  },
  {
    id: 'rp', name: 'Ripple', kind: 'system',
    children: [
      {
        id: 'rp.svelte', name: '@ripple-ui/svelte', kind: 'container',
        children: [{ id: 'ui', name: 'Editor parts', kind: 'component', children: [{ id: 'f.curve', name: 'CurveEditor.svelte', kind: 'code' }] }],
      },
    ],
  },
  { id: 'pp', name: 'PocketPaw', kind: 'system', children: [{ id: 'pp.api', name: 'API', kind: 'container' }] },
];

const relationships: C4Relationship[] = [
  { from: 'captain', to: 'pe', label: 'steers' },
  { from: 'pe', to: 'rp', label: 'imports UI parts' },
  { from: 'pe.spa', to: 'rp.svelte', label: 'imports' },
  { from: 'craft', to: 'ui', label: 'uses parts' },
  { from: 'craft', to: 'stores', label: 'session state' },
  { from: 'pe', to: 'pp', label: 'REST' },
  { from: 'pp', to: 'pe', label: 'Belt develops' },
  { from: 'pe.spa', to: 'pp.api', label: 'REST /api/v1' },
  { from: 'pe.spa', to: 'pe.worker', label: 'postMessage' },
];

const tree = indexTree(elements);
const DRILL = new Set(['pe', 'pe.spa', 'craft']);

describe('computeVisibility', () => {
  it('draws only the top level when nothing is expanded', () => {
    const vis = computeVisibility(tree, new Set());
    expect(vis.visible).toEqual(['captain', 'pe', 'rp', 'pp']);
    expect(vis.boundaries.size).toBe(0);
  });

  it('opens each expanded element in place, parents before children', () => {
    const vis = computeVisibility(tree, new Set([...DRILL, 'f.inspector', 'f.session']));
    expect(vis.visible).toEqual(['captain', 'pe', 'pe.spa', 'craft', 'f.inspector', 'f.session', 'stores', 'pe.worker', 'rp', 'pp']);
    expect([...vis.boundaries]).toEqual(['pe', 'pe.spa', 'craft']);
    // only code with an excerpt becomes a panel
    expect([...vis.panels]).toEqual(['f.inspector']);
  });

  it('ignores an expanded id whose parent is collapsed', () => {
    const vis = computeVisibility(tree, new Set(['craft']));
    expect(vis.visible).not.toContain('craft');
  });
});

describe('liftRelationships', () => {
  it('lifts deep relationships onto the drawn top level, counting the lifted ones', () => {
    const { edges } = liftRelationships(tree, computeVisibility(tree, new Set()), relationships);
    const label = (a: string, b: string) => edges.find((e) => [e.from, e.to].sort().join() === [a, b].sort().join())?.label;
    expect(label('captain', 'pe')).toBe('steers');
    expect(label('pe', 'rp')).toBe('imports UI parts +2');
    expect(label('pe', 'pp')).toBe('REST · Belt develops +1');
    expect(edges).toHaveLength(3);
  });

  it('puts port badges where an edge meets an expanded boundary, and draws inner edges between siblings', () => {
    const vis = computeVisibility(tree, DRILL);
    const { edges } = liftRelationships(tree, vis, relationships, 'craft');
    const edge = (a: string, b: string) => edges.find((e) => [e.from, e.to].sort().join() === [a, b].sort().join())!;
    expect(edge('pe', 'rp')).toMatchObject({ from: 'pe', fromBadge: '→ Ripple · 3', label: undefined });
    expect(edge('pe', 'pp').fromBadge).toBe('⇄ PocketPaw · 3');
    expect(edge('captain', 'pe')).toMatchObject({ from: 'captain', toBadge: '← Captain · 1' });
    expect(edge('pe.spa', 'pe.worker').fromBadge).toBe('→ Craft engine worker · 1');
    expect(edge('craft', 'stores')).toMatchObject({ fromBadge: '→ Stores · 1', items: [{ from: 'craft', to: 'stores', label: 'session state' }] });
  });

  it('gives the scope a chip for each crossing that is drawn further out', () => {
    const { chips } = liftRelationships(tree, computeVisibility(tree, DRILL), relationships, 'craft');
    expect(chips).toEqual([{ target: 'rp', text: '→ Ripple · 1', items: [{ from: 'craft', to: 'ui', label: 'uses parts' }] }]);
  });

  it('draws nothing for a relationship inside a collapsed card', () => {
    const { edges } = liftRelationships(tree, computeVisibility(tree, new Set(['pe'])), [{ from: 'craft', to: 'stores' }]);
    expect(edges).toEqual([]);
  });
});

describe('ghosts and markers', () => {
  it('ghosts what is outside the scope but keeps its frames and contents', () => {
    const ghosts = ghostIds(tree, computeVisibility(tree, DRILL), 'craft');
    expect([...ghosts].sort()).toEqual(['captain', 'pe.worker', 'pp', 'rp', 'stores']);
    expect(ghostIds(tree, computeVisibility(tree, DRILL)).size).toBe(0);
  });

  it('rolls a marker on a hidden element up to its drawn ancestor', () => {
    const dot = { id: 'dev', label: 'dev·ripple', color: 'red' };
    expect(liftMarkers(tree, computeVisibility(tree, new Set()), { 'f.curve': [dot] })).toEqual({ rp: [dot] });
    const deep = computeVisibility(tree, new Set(['rp', 'rp.svelte', 'ui']));
    expect(liftMarkers(tree, deep, { 'f.curve': [dot] })).toEqual({ 'f.curve': [dot] });
    expect(representative(tree, deep, 'f.curve')).toBe('f.curve');
  });
});

describe('code panels', () => {
  it('shows the original with the replaced range marked as removed', () => {
    const v = codeView(INSPECTOR, 'before');
    expect(v).toMatchObject({ startLine: 185, highlight: [192, 197], tone: 'removed', lineCount: 13 });
  });

  it('composes the replacement into the surrounding lines with true numbers', () => {
    const v = codeView(INSPECTOR, 'after');
    const lines = v.text.split('\n');
    expect(lines.slice(6, 8)).toEqual(['old 191', 'new 192']);
    expect(v).toMatchObject({ startLine: 185, highlight: [192, 197], tone: 'added', lineCount: 13 });
  });

  it('marks a whole new file as added, and an unedited file not at all', () => {
    const fresh: C4Code = { startLine: 1, before: [], after: ['a', 'b', 'c'] };
    expect(codeView(fresh, 'after')).toMatchObject({ highlight: [1, 3], tone: 'added' });
    expect(codeView({ startLine: 10, before: ['x'] }, 'after')).toMatchObject({ highlight: undefined, tone: 'accent', lineCount: 1 });
  });

  it('sizes the panel for the longer side once long lines wrap', () => {
    const short = codePanelSize({ startLine: 1, before: ['a'] });
    const long = codePanelSize({ ...INSPECTOR, before: INSPECTOR.before.map((l) => l.padEnd(180, 'x')) });
    expect(short.width).toBe(720);
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.height).toBeGreaterThan(13 * 2 * 20);
  });
});

// Runs ELK; on a loaded machine that outlasts vitest's 5s default.
describe('computeSemanticLayout', { timeout: 30000 }, () => {
  it('nests each boundary around its children, honours its minimum, and puts badges on its border', async () => {
    const vis = computeVisibility(tree, new Set(['pe', 'pe.spa']));
    const { edges } = liftRelationships(tree, vis, relationships, 'pe.spa');
    const { positions, routes } = await computeSemanticLayout(
      tree,
      vis,
      edges,
      () => ({ width: 200, height: 110 }),
      (id) => ({ width: id === 'pe' ? 1400 : 300, height: 200 })
    );
    const box = (id: string) => positions.get(id)!;
    const within = (inner: string, outer: string) => {
      const [a, b] = [box(inner), box(outer)];
      return a.x >= b.x && a.y > b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
    };
    expect(within('pe.spa', 'pe')).toBe(true);
    expect(within('craft', 'pe.spa')).toBe(true);
    expect(box('pe').width).toBeGreaterThanOrEqual(1400);

    const toRipple = edges.find((e) => e.fromBadge?.startsWith('→ Ripple'))!;
    const route = routes.get(toRipple.key)!;
    const start = route.points[0];
    const pe = box('pe');
    expect(start.y === pe.y || start.y === pe.y + pe.height || start.x === pe.x || start.x === pe.x + pe.width).toBe(true);
    // the badge sits by the line where it leaves the boundary
    expect(Math.hypot(route.tail!.x - start.x, route.tail!.y - start.y)).toBeLessThan(200);
  });
});

describe('semantic edges keep relationship style', () => {
  const sys = (id: string): C4Element => ({ id, name: id.toUpperCase(), kind: 'system' });
  const flow = (relationships: C4Relationship[]) =>
    buildSemanticFlow({ level: 'context', title: '', elements: [sys('a'), sys('b'), sys('c')], relationships }, new Set(), undefined, {});

  it('dashes and animates an async edge, dashes an event edge in the warning tone', async () => {
    const { edges } = await flow([
      { from: 'a', to: 'b', label: 'queues', style: 'async' },
      { from: 'b', to: 'c', label: 'emits', style: 'event' },
    ]);
    const ab = edges.find((e) => e.source === 'a')!;
    const bc = edges.find((e) => e.source === 'b')!;
    expect([ab.animated, ab.style]).toEqual([true, expect.stringContaining('stroke-dasharray: 8 4')]);
    expect([bc.animated, bc.style]).toEqual([false, expect.stringContaining('--ripple-warning')]);
    expect(bc.style).toContain('stroke-dasharray: 4 4');
  });

  it('draws an edge solid when the relationships behind it mix styles', async () => {
    const { edges } = await flow([
      { from: 'a', to: 'b', label: 'calls' },
      { from: 'a', to: 'b', label: 'queues', style: 'async' },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].animated).toBe(false);
    expect(edges[0].style).not.toContain('dasharray');
  });
});

