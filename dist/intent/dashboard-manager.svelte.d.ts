/**
 * dashboard-manager.svelte.ts — Manages mutable dashboard specs for persistent pockets.
 * Created: 2026-03-27 — Spec mutation API for add/remove/update/move widget operations.
 * Each mutation produces a new spec and emits a 'spec-changed' event.
 */
import type { UINode } from '../schema/ui-spec.js';
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
export declare class DashboardManager {
    spec: DashboardSpec;
    private changeHandlers;
    /** Increments on every internal mutation. Consumers can compare to skip redundant loads. */
    revision: number;
    constructor(initial?: DashboardSpec);
    /** Replace the entire spec (e.g., on load). */
    load(spec: DashboardSpec): void;
    /** Add a widget to the dashboard. */
    addWidget(widget: DashboardWidget): void;
    /** Remove a widget by ID. */
    removeWidget(widgetId: string): void;
    /** Update a widget's properties. Merges with existing props. */
    updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void;
    /** Move a widget to a new index position. */
    moveWidget(widgetId: string, toIndex: number): void;
    /** Reorder widgets by providing the new order of IDs. */
    reorder(widgetIds: string[]): void;
    /** Get a widget by ID. */
    getWidget(widgetId: string): DashboardWidget | undefined;
    /** Subscribe to spec changes. */
    onChange(handler: SpecChangeHandler): () => boolean;
    private emitChange;
}
export declare function createDashboardManager(initial?: DashboardSpec): DashboardManager;
export {};
