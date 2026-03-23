/**
 * @file layout-engine.ts
 * @description Determines the best layout for an IntentSpec based on
 * intent type, data shape, and display hints.
 *
 * This is the "smart" part of the system that makes layout decisions
 * so the AI doesn't have to specify exact layouts.
 */
import type { UniversalSpec } from '../schema/universal-spec.js';
type IntentSpec = UniversalSpec & {
    form_fields?: any[];
    data?: any;
    display?: any;
    fields?: Record<string, string>;
};
export type LayoutType = 'card-grid' | 'image-grid' | 'icon-grid' | 'media-grid' | 'list' | 'list-detail' | 'scrollable-list' | 'detail-hero' | 'detail-split' | 'detail-simple' | 'detail' | 'article' | 'workout-player' | 'form-simple' | 'form-sections' | 'form-wizard' | 'search-results' | 'search' | 'summary-card' | 'info-hero' | 'info-grid' | 'action-buttons' | 'table' | 'workspace' | 'dashboard' | 'widget' | 'itinerary' | 'custom';
export interface LayoutContext {
    /** Resolved IntentSpec */
    spec: IntentSpec;
    /** Number of items in data */
    itemCount: number;
    /** Which fields are available in the data */
    availableFields: Set<string>;
    /** Device type (future use) */
    device?: 'mobile' | 'tablet' | 'desktop';
}
/**
 * Analyze the data to understand what fields are available.
 */
export declare function analyzeData(spec: IntentSpec): {
    itemCount: number;
    availableFields: Set<string>;
};
/**
 * Determine the best layout for an IntentSpec.
 */
export declare function determineLayout(spec: IntentSpec): LayoutType;
export interface LayoutMetadata {
    /** Layout type */
    type: LayoutType;
    /** Number of columns (for grid layouts) */
    columns: number;
    /** Whether to show selection indicators */
    showSelection: boolean;
    /** Whether to show images */
    showImages: boolean;
    /** Whether to show prices */
    showPrices: boolean;
    /** Compact mode */
    compact: boolean;
}
/**
 * Get layout metadata for rendering configuration.
 */
export declare function getLayoutMetadata(spec: IntentSpec): LayoutMetadata;
export {};
