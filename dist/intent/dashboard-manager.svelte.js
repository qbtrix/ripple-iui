/**
 * dashboard-manager.svelte.ts — Manages mutable dashboard specs for persistent pockets.
 * Created: 2026-03-27 — Spec mutation API for add/remove/update/move widget operations.
 * Each mutation produces a new spec and emits a 'spec-changed' event.
 */
/**
 * Manages a mutable dashboard spec. Used by DashboardRenderer for persistent pockets.
 */
export class DashboardManager {
    spec = $state({ widgets: [], layout: { type: 'grid', columns: 3, gap: 10 } });
    changeHandlers = new Set();
    constructor(initial) {
        if (initial) {
            this.spec = { ...initial };
        }
    }
    /** Replace the entire spec (e.g., on load). */
    load(spec) {
        this.spec = { ...spec };
    }
    /** Add a widget to the dashboard. */
    addWidget(widget) {
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
    removeWidget(widgetId) {
        this.spec = {
            ...this.spec,
            widgets: this.spec.widgets.filter(w => w.id !== widgetId),
        };
        this.emitChange();
    }
    /** Update a widget's properties. Merges with existing props. */
    updateWidget(widgetId, updates) {
        this.spec = {
            ...this.spec,
            widgets: this.spec.widgets.map(w => w.id === widgetId
                ? { ...w, ...updates, props: { ...w.props, ...updates.props } }
                : w),
        };
        this.emitChange();
    }
    /** Move a widget to a new index position. */
    moveWidget(widgetId, toIndex) {
        const widgets = [...this.spec.widgets];
        const fromIndex = widgets.findIndex(w => w.id === widgetId);
        if (fromIndex === -1 || fromIndex === toIndex)
            return;
        const [widget] = widgets.splice(fromIndex, 1);
        widgets.splice(toIndex, 0, widget);
        this.spec = { ...this.spec, widgets };
        this.emitChange();
    }
    /** Reorder widgets by providing the new order of IDs. */
    reorder(widgetIds) {
        const widgetMap = new Map(this.spec.widgets.map(w => [w.id, w]));
        const reordered = widgetIds
            .map(id => widgetMap.get(id))
            .filter(Boolean);
        // Append any widgets not in the list (safety)
        for (const w of this.spec.widgets) {
            if (!widgetIds.includes(w.id))
                reordered.push(w);
        }
        this.spec = { ...this.spec, widgets: reordered };
        this.emitChange();
    }
    /** Get a widget by ID. */
    getWidget(widgetId) {
        return this.spec.widgets.find(w => w.id === widgetId);
    }
    /** Subscribe to spec changes. */
    onChange(handler) {
        this.changeHandlers.add(handler);
        return () => this.changeHandlers.delete(handler);
    }
    emitChange() {
        for (const handler of this.changeHandlers) {
            handler(this.spec);
        }
    }
}
export function createDashboardManager(initial) {
    return new DashboardManager(initial);
}
