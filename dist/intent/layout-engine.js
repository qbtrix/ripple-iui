/**
 * @file layout-engine.ts
 * @description Determines the best layout for an IntentSpec based on
 * intent type, data shape, and display hints.
 *
 * This is the "smart" part of the system that makes layout decisions
 * so the AI doesn't have to specify exact layouts.
 */
/**
 * Analyze the data to understand what fields are available.
 */
export function analyzeData(spec) {
    // Handle missing or invalid data
    if (!spec.data || typeof spec.data !== 'object') {
        return { itemCount: 0, availableFields: new Set() };
    }
    const items = spec.data.items ?? [];
    const itemCount = items.length;
    // Collect all unique keys from items
    const availableFields = new Set();
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
function hasField(fields, fieldName, available) {
    if (!fields)
        return false;
    const mappedTo = fields[fieldName];
    if (!mappedTo || typeof mappedTo !== 'string')
        return false;
    return available.has(mappedTo);
}
/**
 * Determine the best layout for an IntentSpec.
 */
export function determineLayout(spec) {
    const { intent, display, fields } = spec;
    const { itemCount, availableFields } = analyzeData(spec);
    // If explicit layout specified and not 'auto', use it
    if (display?.layout && display.layout !== 'auto') {
        return mapHintToLayout(display.layout, spec);
    }
    // Auto-determine based on intent and data
    switch (intent) {
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
function mapHintToLayout(hint, spec) {
    const { availableFields } = analyzeData(spec);
    const hasImages = hasField(spec.fields, 'image', availableFields);
    switch (hint) {
        case 'cards':
            return hasImages ? 'card-grid' : 'icon-grid';
        case 'list':
            return 'list';
        case 'grid':
            return hasImages ? 'image-grid' : 'card-grid';
        case 'carousel':
            return 'scrollable-list';
        case 'table':
            return 'table';
        case 'hero':
            return 'info-hero';
        case 'timeline':
        case 'itinerary':
            return 'itinerary';
        default:
            return 'list';
    }
}
/**
 * Determine layout for 'browse' intent.
 */
function determineBrowseLayout(spec, itemCount, availableFields) {
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
function determineSelectLayout(spec, itemCount, availableFields) {
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
function determineDetailLayout(spec, availableFields) {
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
function determineFormLayout(spec) {
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
function determineInfoLayout(spec, itemCount) {
    // Single item -> hero display
    if (itemCount <= 1) {
        return 'info-hero';
    }
    // Multiple items -> grid
    return 'info-grid';
}
/**
 * Get layout metadata for rendering configuration.
 */
export function getLayoutMetadata(spec) {
    const layout = determineLayout(spec);
    const { availableFields } = analyzeData(spec);
    const hasImages = hasField(spec.fields, 'image', availableFields);
    const hasPrices = hasField(spec.fields, 'price', availableFields);
    // Determine columns based on layout
    let columns = spec.display?.columns ?? 2;
    if (layout === 'list' || layout === 'scrollable-list') {
        columns = 1;
    }
    else if (layout === 'image-grid') {
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
