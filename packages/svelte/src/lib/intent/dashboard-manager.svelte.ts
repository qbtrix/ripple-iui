/**
 * dashboard-manager.svelte.ts — Manages mutable dashboard specs for persistent pockets.
 * Created: 2026-03-27 — Spec mutation API for add/remove/update/move widget operations.
 * Each mutation produces a new spec and emits a 'spec-changed' event.
 */

import type { UINode } from '@ripple-ui/core';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  span?: number;
  props?: Record<string, any>;
  children?: UINode[];
  data?: any;
}

export interface DashboardSpec {
  widgets: DashboardWidget[];
  layout?: {
    type: 'grid' | 'masonry';
    columns?: number;
    gap?: number;
  };
}

type SpecChangeHandler = (spec: DashboardSpec) => void;

/**
 * Manages a mutable dashboard spec. Used by DashboardRenderer for persistent pockets.
 */
export class DashboardManager {
  spec = $state<DashboardSpec>({ widgets: [], layout: { type: 'grid', columns: 3, gap: 10 } });
  private changeHandlers: Set<SpecChangeHandler> = new Set();
  /** Increments on every internal mutation. Consumers can compare to skip redundant loads. */
  revision = $state(0);

  constructor(initial?: DashboardSpec) {
    if (initial) {
      this.spec = { ...initial };
    }
  }

  /** Replace the entire spec (e.g., on load). */
  load(spec: DashboardSpec) {
    this.spec = { ...spec };
  }

  /** Add a widget to the dashboard. */
  addWidget(widget: DashboardWidget) {
    // Generate ID if missing
    if (!widget.id) {
      widget.id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }
    this.spec = {
      ...this.spec,
      widgets: [...this.spec.widgets, widget],
    };
    this.emitChange();
  }

  /** Remove a widget by ID. */
  removeWidget(widgetId: string) {
    this.spec = {
      ...this.spec,
      widgets: this.spec.widgets.filter(w => w.id !== widgetId),
    };
    this.emitChange();
  }

  /** Update a widget's properties. Merges with existing props. */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>) {
    this.spec = {
      ...this.spec,
      widgets: this.spec.widgets.map(w =>
        w.id === widgetId
          ? { ...w, ...updates, props: { ...w.props, ...updates.props } }
          : w
      ),
    };
    this.emitChange();
  }

  /** Move a widget to a new index position. */
  moveWidget(widgetId: string, toIndex: number) {
    const widgets = [...this.spec.widgets];
    const fromIndex = widgets.findIndex(w => w.id === widgetId);
    if (fromIndex === -1 || fromIndex === toIndex) return;

    const [widget] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, widget);

    this.spec = { ...this.spec, widgets };
    this.emitChange();
  }

  /** Reorder widgets by providing the new order of IDs. */
  reorder(widgetIds: string[]) {
    const widgetMap = new Map(this.spec.widgets.map(w => [w.id, w]));
    const reordered = widgetIds
      .map(id => widgetMap.get(id))
      .filter(Boolean) as DashboardWidget[];

    // Append any widgets not in the list (safety)
    for (const w of this.spec.widgets) {
      if (!widgetIds.includes(w.id)) reordered.push(w);
    }

    this.spec = { ...this.spec, widgets: reordered };
    this.emitChange();
  }

  /** Get a widget by ID. */
  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.spec.widgets.find(w => w.id === widgetId);
  }

  /** Subscribe to spec changes. */
  onChange(handler: SpecChangeHandler) {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  private emitChange() {
    this.revision++;
    for (const handler of this.changeHandlers) {
      handler(this.spec);
    }
  }
}

export function createDashboardManager(initial?: DashboardSpec): DashboardManager {
  return new DashboardManager(initial);
}
