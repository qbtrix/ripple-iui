// dashboard-manager.test.ts — Unit tests for the DashboardManager.
// Created: 2026-03-27 — Tests for widget CRUD, reorder, events, and spec management.
import { describe, it, expect, vi } from 'vitest';
import {
  createDashboardManager,
  DashboardManager,
  type DashboardWidget,
  type DashboardSpec,
} from '../dashboard-manager.svelte.js';

function widget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return { id: '', type: 'metric', title: 'Test Widget', ...overrides };
}

// =============================================================================
// createDashboardManager factory
// =============================================================================

describe('createDashboardManager', () => {
  it('returns a DashboardManager instance', () => {
    const mgr = createDashboardManager();
    expect(mgr).toBeInstanceOf(DashboardManager);
  });

  it('initializes with empty widgets when no initial spec', () => {
    const mgr = createDashboardManager();
    expect(mgr.spec.widgets).toEqual([]);
  });

  it('initializes with default grid layout', () => {
    const mgr = createDashboardManager();
    expect(mgr.spec.layout).toEqual({ type: 'grid', columns: 3, gap: 10 });
  });

  it('loads initial spec when provided', () => {
    const initial: DashboardSpec = {
      widgets: [{ id: 'w1', type: 'metric', title: 'Revenue' }],
      layout: { type: 'masonry', columns: 4 },
    };
    const mgr = createDashboardManager(initial);
    expect(mgr.spec.widgets).toHaveLength(1);
    expect(mgr.spec.widgets[0].id).toBe('w1');
    expect(mgr.spec.layout?.type).toBe('masonry');
  });
});

// =============================================================================
// addWidget
// =============================================================================

describe('addWidget', () => {
  it('adds a widget to empty dashboard', () => {
    const mgr = createDashboardManager();
    mgr.addWidget(widget({ id: 'w1' }));
    expect(mgr.spec.widgets).toHaveLength(1);
    expect(mgr.spec.widgets[0].id).toBe('w1');
  });

  it('generates an ID when widget.id is empty', () => {
    const mgr = createDashboardManager();
    mgr.addWidget(widget({ id: '' }));
    expect(mgr.spec.widgets[0].id).toMatch(/^w-/);
  });

  it('preserves a provided ID', () => {
    const mgr = createDashboardManager();
    mgr.addWidget(widget({ id: 'custom-id' }));
    expect(mgr.spec.widgets[0].id).toBe('custom-id');
  });

  it('appends multiple widgets in order', () => {
    const mgr = createDashboardManager();
    mgr.addWidget(widget({ id: 'w1', title: 'First' }));
    mgr.addWidget(widget({ id: 'w2', title: 'Second' }));
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['w1', 'w2']);
  });
});

// =============================================================================
// removeWidget
// =============================================================================

describe('removeWidget', () => {
  it('removes a widget by ID', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'w1', type: 'metric', title: 'A' },
        { id: 'w2', type: 'metric', title: 'B' },
      ],
    });
    mgr.removeWidget('w1');
    expect(mgr.spec.widgets).toHaveLength(1);
    expect(mgr.spec.widgets[0].id).toBe('w2');
  });

  it('is a no-op for non-existent ID', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'A' }],
    });
    mgr.removeWidget('nope');
    expect(mgr.spec.widgets).toHaveLength(1);
  });
});

// =============================================================================
// updateWidget
// =============================================================================

describe('updateWidget', () => {
  it('merges top-level properties', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'Old Title' }],
    });
    mgr.updateWidget('w1', { title: 'New Title' });
    expect(mgr.spec.widgets[0].title).toBe('New Title');
    expect(mgr.spec.widgets[0].type).toBe('metric');
  });

  it('merges props deeply', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'W', props: { color: 'red', size: 'lg' } }],
    });
    mgr.updateWidget('w1', { props: { color: 'blue' } });
    expect(mgr.spec.widgets[0].props).toEqual({ color: 'blue', size: 'lg' });
  });

  it('is a no-op for non-existent widget ID', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'A' }],
    });
    mgr.updateWidget('nope', { title: 'X' });
    expect(mgr.spec.widgets[0].title).toBe('A');
  });
});

// =============================================================================
// moveWidget
// =============================================================================

describe('moveWidget', () => {
  it('moves a widget to a new index position', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
        { id: 'c', type: 'metric', title: 'C' },
      ],
    });
    mgr.moveWidget('a', 2);
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['b', 'c', 'a']);
  });

  it('is a no-op when moving to the same position', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
      ],
    });
    mgr.moveWidget('a', 0);
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('is a no-op for non-existent widget', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'a', type: 'metric', title: 'A' }],
    });
    mgr.moveWidget('nope', 0);
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['a']);
  });
});

// =============================================================================
// reorder
// =============================================================================

describe('reorder', () => {
  it('reorders widgets by ID list', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
        { id: 'c', type: 'metric', title: 'C' },
      ],
    });
    mgr.reorder(['c', 'a', 'b']);
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends missing widgets not in ID list', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
        { id: 'c', type: 'metric', title: 'C' },
      ],
    });
    mgr.reorder(['b']); // only 'b' in the list
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['b', 'a', 'c']);
  });

  it('ignores IDs not present in the dashboard', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'a', type: 'metric', title: 'A' }],
    });
    mgr.reorder(['nonexistent', 'a']);
    expect(mgr.spec.widgets.map((w) => w.id)).toEqual(['a']);
  });
});

// =============================================================================
// load
// =============================================================================

describe('load', () => {
  it('replaces the entire spec', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'old', type: 'metric', title: 'Old' }],
    });
    mgr.load({
      widgets: [{ id: 'new', type: 'chart', title: 'New' }],
      layout: { type: 'masonry' },
    });
    expect(mgr.spec.widgets).toHaveLength(1);
    expect(mgr.spec.widgets[0].id).toBe('new');
    expect(mgr.spec.layout?.type).toBe('masonry');
  });
});

// =============================================================================
// getWidget
// =============================================================================

describe('getWidget', () => {
  it('returns widget by ID', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'Revenue' }],
    });
    const w = mgr.getWidget('w1');
    expect(w).toBeDefined();
    expect(w!.title).toBe('Revenue');
  });

  it('returns undefined for missing widget', () => {
    const mgr = createDashboardManager({ widgets: [] });
    expect(mgr.getWidget('nope')).toBeUndefined();
  });
});

// =============================================================================
// onChange
// =============================================================================

describe('onChange', () => {
  it('fires callback on addWidget', () => {
    const mgr = createDashboardManager();
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.addWidget(widget({ id: 'w1' }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(mgr.spec);
  });

  it('fires callback on removeWidget', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'A' }],
    });
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.removeWidget('w1');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires callback on updateWidget', () => {
    const mgr = createDashboardManager({
      widgets: [{ id: 'w1', type: 'metric', title: 'A' }],
    });
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.updateWidget('w1', { title: 'B' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires callback on moveWidget', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
      ],
    });
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.moveWidget('a', 1);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires callback on reorder', () => {
    const mgr = createDashboardManager({
      widgets: [
        { id: 'a', type: 'metric', title: 'A' },
        { id: 'b', type: 'metric', title: 'B' },
      ],
    });
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.reorder(['b', 'a']);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('unsubscribe stops callbacks', () => {
    const mgr = createDashboardManager();
    const handler = vi.fn();
    const unsub = mgr.onChange(handler);
    unsub();
    mgr.addWidget(widget({ id: 'w1' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire on load (load has no emitChange)', () => {
    const mgr = createDashboardManager();
    const handler = vi.fn();
    mgr.onChange(handler);
    mgr.load({ widgets: [{ id: 'w1', type: 'metric', title: 'A' }] });
    expect(handler).not.toHaveBeenCalled();
  });
});
