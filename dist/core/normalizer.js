/**
 * Normalizes any spec input into a UniversalSpec.
 * Lightweight — no Zod validation (that's expensive for reactive rendering).
 * Use parseUniversalSpec() separately if you need strict validation.
 */
export function normalizeSpec(input) {
    if (!input || typeof input !== 'object') {
        return {
            version: '2.0',
            intent: 'custom',
            lifecycle: { type: 'ephemeral' },
            ui: { type: 'container', children: [] },
            selection: 'none'
        };
    }
    // Already a UniversalSpec (has intent)
    if (input.intent) {
        return input;
    }
    // Legacy UISpec (has ui but no intent)
    if (input.ui) {
        return {
            version: '2.0',
            intent: 'custom',
            lifecycle: { type: 'ephemeral' },
            ui: input.ui,
            data: input.data,
            theme: input.theme,
            selection: 'none'
        };
    }
    // Fallback
    return {
        version: '2.0',
        intent: 'custom',
        lifecycle: { type: 'ephemeral' },
        ui: { type: 'container', children: [] },
        selection: 'none'
    };
}
