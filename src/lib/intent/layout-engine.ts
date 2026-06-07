/**
 * @file layout-engine.ts
 * @description Determines the best layout for an IntentSpec based on
 * intent type, data shape, and display hints.
 *
 * This is the "smart" part of the system that makes layout decisions
 * so the AI doesn't have to specify exact layouts.
 *
 * @changes
 *   - 2026-06-07: map the composite + ported display.layout hints
 *     (comparison/checklist/invoice/report/timeline/table/article) to dedicated
 *     LayoutType values, so IntentRenderer can route a generic spec to a
 *     designed composite layout via the hint without a new IntentType. The
 *     auto-determine switch is unchanged — only explicit hints reach these.
 */

import type { UniversalSpec } from '../schema/universal-spec.js';

// Ripple uses UniversalSpec as its intent spec
type IntentSpec = UniversalSpec & { form_fields?: any[]; data?: any; display?: any; fields?: Record<string, string> };
type FieldMapping = Record<string, string>;

// =============================================================================
// LAYOUT TYPES
// =============================================================================

export type LayoutType =
	// Grid layouts
	| 'card-grid' // Cards with images/icons in grid
	| 'image-grid' // Pure image grid (Pinterest/Masonry style)
	| 'icon-grid' // Icon-based cards
	| 'media-grid' // Video/media focused grid (for explore + media)

	// List layouts
	| 'list' // Simple list with items
	| 'list-detail' // List with detail panel
	| 'scrollable-list' // Horizontally scrollable

	// Detail layouts
	| 'detail-hero' // Hero image at top
	| 'detail-split' // Image left, info right
	| 'detail-simple' // No image, text focused
	| 'detail' // Generic detail (auto-selects hero or simple)

	// Content layouts
	| 'article' // Article/learning content (for learn + article)
	| 'workout-player' // Workout video player (for consume + exercise)

	// Form layouts
	| 'form-simple' // Single column form
	| 'form-sections' // Multi-section form
	| 'form-wizard' // Step-by-step form

	// Search layouts
	| 'search-results' // Search with filters and results
	| 'search' // Alias for search-results

	// Other layouts
	| 'summary-card' // Confirmation/summary view
	| 'info-hero' // Large single value display
	| 'info-grid' // Multiple info cards
	| 'action-buttons' // Simple action buttons
	| 'table' // Table layout
	| 'comparison' // Side-by-side comparison (composite ComparisonLayout)
	| 'checklist' // Gated checklist (composite ChecklistLayout)
	| 'invoice' // Invoice / quote / receipt document (composite InvoiceLayout)
	| 'report' // Printable structured report (composite ReportLayout)
	| 'timeline' // Chronological timeline (ported TimelineLayout)
	| 'workspace' // Workspace intent (tool-like interfaces)
	| 'dashboard' // Dashboard intent with widgets
	| 'widget' // Widget intent (single widget display)
	| 'itinerary' // Multi-day travel plans with timeline
	| 'custom'; // Custom/escape hatch - renders raw UISpec

// =============================================================================
// LAYOUT DETERMINATION
// =============================================================================

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
export function analyzeData(
	spec: IntentSpec
): { itemCount: number; availableFields: Set<string> } {
	// Handle missing or invalid data
	if (!spec.data || typeof spec.data !== 'object') {
		return { itemCount: 0, availableFields: new Set<string>() };
	}

	const items = spec.data.items ?? [];
	const itemCount = items.length;

	// Collect all unique keys from items
	const availableFields = new Set<string>();
	for (const item of items) {
		if (item && typeof item === 'object') {
			for (const key of Object.keys(item)) {
				availableFields.add(key);
			}
		}
	}

	return { itemCount, availableFields };
}

/**
 * Check if a field is mapped and available in data.
 */
function hasField(fields: FieldMapping | undefined, fieldName: keyof FieldMapping, available: Set<string>): boolean {
	if (!fields) return false;
	const mappedTo = fields[fieldName];
	if (!mappedTo || typeof mappedTo !== 'string') return false;
	return available.has(mappedTo);
}

/**
 * Determine the best layout for an IntentSpec.
 */
export function determineLayout(spec: IntentSpec): LayoutType {
	const { intent, display, fields } = spec;
	const { itemCount, availableFields } = analyzeData(spec);

	// If explicit layout specified and not 'auto', use it
	if (display?.layout && display.layout !== 'auto') {
		return mapHintToLayout(display.layout, spec);
	}

	// Auto-determine based on intent and data
	switch (intent as string) {
		case 'browse':
			return determineBrowseLayout(spec, itemCount, availableFields);

		case 'select':
			return determineSelectLayout(spec, itemCount, availableFields);

		case 'detail':
			return determineDetailLayout(spec, availableFields);

		case 'form':
			return determineFormLayout(spec);

		case 'confirm':
		case 'quick_confirm':
			// If it has form fields, use a form layout to allow editing
			if (spec.form_fields && spec.form_fields.length > 0) {
				return 'form-simple';
			}
			return 'summary-card';

		case 'info':
			return determineInfoLayout(spec, itemCount);

		case 'search':
			return 'search-results';

		case 'action':
			return 'action-buttons';

		case 'workspace':
			return 'workspace';

		case 'dashboard':
			return 'dashboard';

		case 'widget':
			return 'widget';

		case 'itinerary':
			return 'itinerary';

		case 'custom':
			return 'custom';

		default:
			return 'list';
	}
}

/**
 * Map display hint to actual layout type.
 */
function mapHintToLayout(hint: string, spec: IntentSpec): LayoutType {
	const { availableFields } = analyzeData(spec);
	const hasImages = hasField(spec.fields, 'image', availableFields);

	switch (hint) {
		case 'cards':
			return hasImages ? 'card-grid' : 'icon-grid';
		case 'list':
			return 'list';
		case 'grid':
			return hasImages ? 'image-grid' : 'card-grid';
		case 'masonry':
			return 'image-grid';
		case 'carousel':
			return 'scrollable-list';
		case 'split':
			return 'detail-split';
		case 'table':
			return 'table';
		case 'hero':
			return 'info-hero';
		case 'itinerary':
			return 'itinerary';
		// Composite + ported designed-layout hints (2026-06-07).
		case 'comparison':
			return 'comparison';
		case 'checklist':
			return 'checklist';
		case 'invoice':
			return 'invoice';
		case 'report':
			return 'report';
		case 'timeline':
			return 'timeline';
		case 'article':
			return 'article';
		default:
			return 'list';
	}
}

/**
 * Determine layout for 'browse' intent.
 */
function determineBrowseLayout(
	spec: IntentSpec,
	itemCount: number,
	availableFields: Set<string>
): LayoutType {
	const hasImages = hasField(spec.fields, 'image', availableFields);
	const hasIcons = hasField(spec.fields, 'icon', availableFields);
	const hasPrices = hasField(spec.fields, 'price', availableFields);

	// Many items with images -> image grid
	if (hasImages && itemCount > 10) {
		return 'image-grid';
	}

	// Products (images + prices) -> card grid
	if (hasImages && hasPrices) {
		return 'card-grid';
	}

	// Has images -> card grid
	if (hasImages) {
		return 'card-grid';
	}

	// Icons only -> icon grid
	if (hasIcons) {
		return 'icon-grid';
	}

	// Text only -> list
	return 'list';
}

/**
 * Determine layout for 'select' intent.
 */
function determineSelectLayout(
	spec: IntentSpec,
	itemCount: number,
	availableFields: Set<string>
): LayoutType {
	const hasImages = hasField(spec.fields, 'image', availableFields);
	const hasIcons = hasField(spec.fields, 'icon', availableFields);

	// Few items with visuals -> cards
	if (itemCount <= 6 && (hasImages || hasIcons)) {
		return hasImages ? 'card-grid' : 'icon-grid';
	}

	// Many items -> scrollable list
	if (itemCount > 8) {
		return 'scrollable-list';
	}

	// Default -> list
	return 'list';
}

/**
 * Determine layout for 'detail' intent.
 */
function determineDetailLayout(
	spec: IntentSpec,
	availableFields: Set<string>
): LayoutType {
	const hasImages = hasField(spec.fields, 'image', availableFields);
	const hasDescription = hasField(spec.fields, 'description', availableFields);

	// Has image -> hero layout
	if (hasImages) {
		return 'detail-hero';
	}

	// Long content -> simple layout
	if (hasDescription) {
		return 'detail-simple';
	}

	return 'detail-simple';
}

/**
 * Determine layout for 'form' intent.
 */
function determineFormLayout(spec: IntentSpec): LayoutType {
	const fieldCount = spec.form_fields?.length ?? 0;

	// Many fields -> sections
	if (fieldCount > 6) {
		return 'form-sections';
	}

	return 'form-simple';
}

/**
 * Determine layout for 'info' intent.
 */
function determineInfoLayout(spec: IntentSpec, itemCount: number): LayoutType {
	// Single item -> hero display
	if (itemCount <= 1) {
		return 'info-hero';
	}

	// Multiple items -> grid
	return 'info-grid';
}

// =============================================================================
// LAYOUT METADATA
// =============================================================================

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
export function getLayoutMetadata(spec: IntentSpec): LayoutMetadata {
	const layout = determineLayout(spec);
	const { availableFields } = analyzeData(spec);

	const hasImages = hasField(spec.fields, 'image', availableFields);
	const hasPrices = hasField(spec.fields, 'price', availableFields);

	// Determine columns based on layout
	let columns = spec.display?.columns ?? 2;
	if (layout === 'list' || layout === 'scrollable-list') {
		columns = 1;
	} else if (layout === 'image-grid') {
		columns = 3;
	}

	return {
		type: layout,
		columns,
		showSelection: spec.intent === 'select',
		showImages: hasImages && (spec.display?.show_images !== false),
		showPrices: hasPrices && (spec.display?.show_prices !== false),
		compact: spec.display?.compact ?? false
	};
}
