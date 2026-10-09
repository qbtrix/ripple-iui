// @file widgets/validate-catalog-bound.test.ts
// @description Tests for the registry-bound catalog gate and specIssues.
//   These assert against the real widget catalog ("flex passes"), so they
//   belong to the bound wrappers; the engine versions, which know no
//   widgets, are tested in packages/core.
import { describe, it, expect } from 'vitest';
import { specIssues, validateCatalog } from './validate-catalog-bound.js';

describe('validateCatalog', () => {
  it('detects an unknown widget type', () => {
    const spec = {
      ui: {
        type: 'flex',
        children: [{ type: 'definitely-not-a-real-widget' }]
      }
    };
    const unknown = validateCatalog(spec as any);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].type).toBe('definitely-not-a-real-widget');
    expect(unknown[0].path).toBe('ui.children[0]');
  });

  it('returns an empty array when every type is registered', () => {
    const spec = {
      ui: {
        type: 'flex',
        children: [
          { type: 'text', props: { content: 'hi' } },
          { type: 'button', props: { label: 'ok' } }
        ]
      }
    };
    expect(validateCatalog(spec as any)).toEqual([]);
  });

  it('treats `if` and `each` control-flow types as known', () => {
    const spec = {
      ui: {
        type: 'each',
        items: '{state.rows}',
        children: [{ type: 'if', condition: 'true', children: [{ type: 'text' }] }]
      }
    };
    expect(validateCatalog(spec as any)).toEqual([]);
  });

  it('recognizes the new media widgets (model-viewer, embed)', () => {
    const spec = {
      ui: {
        type: 'flex',
        children: [
          { type: 'model-viewer', props: { src: 'm.glb' } },
          { type: 'embed', props: { mode: 'url', url: 'https://x.com', title: 't' } }
        ]
      }
    };
    expect(validateCatalog(spec as any)).toEqual([]);
  });

  it('walks else_children of an `if` node', () => {
    const spec = {
      ui: {
        type: 'if',
        condition: 'false',
        children: [{ type: 'text' }],
        else_children: [{ type: 'ghost-widget' }]
      }
    };
    const unknown = validateCatalog(spec as any);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].type).toBe('ghost-widget');
    expect(unknown[0].path).toBe('ui.else_children[0]');
  });

  it('reports multiple unknown nodes with distinct paths', () => {
    const spec = {
      ui: {
        type: 'grid',
        children: [
          { type: 'text' },
          { type: 'mystery-a' },
          { type: 'card', children: [{ type: 'mystery-b' }] }
        ]
      }
    };
    const unknown = validateCatalog(spec as any);
    expect(unknown.map((u) => u.type).sort()).toEqual(['mystery-a', 'mystery-b']);
    expect(unknown.map((u) => u.path)).toContain('ui.children[1]');
    expect(unknown.map((u) => u.path)).toContain('ui.children[2].children[0]');
  });

  it('accepts a bare UINode (no `ui` wrapper)', () => {
    const node = { type: 'not-real' };
    const unknown = validateCatalog(node as any);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].path).toBe('ui');
  });

  it('honors extraWidgetTypes as additional known types', () => {
    const spec = { ui: { type: 'host-custom-widget' } };
    expect(validateCatalog(spec as any)).toHaveLength(1);
    expect(
      validateCatalog(spec as any, { extraWidgetTypes: ['host-custom-widget'] })
    ).toEqual([]);
  });

  it('returns an empty array for null / undefined input', () => {
    expect(validateCatalog(null)).toEqual([]);
    expect(validateCatalog(undefined)).toEqual([]);
  });
});

describe('specIssues (bound)', () => {
  it('knows the built-in catalog without being given one', () => {
    const spec = { ui: { type: 'flex', children: [{ type: 'text' }, { type: 'lsit' }] } };
    expect(specIssues(spec)).toEqual([
      { path: 'ui.children[1]', message: `widget type "lsit" isn't in the catalog` }
    ]);
  });
});
