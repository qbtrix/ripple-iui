import type { UniversalSpec } from '../schema/universal-spec.js';
/**
 * Normalizes any spec input into a UniversalSpec.
 * Lightweight — no Zod validation (that's expensive for reactive rendering).
 * Use parseUniversalSpec() separately if you need strict validation.
 */
export declare function normalizeSpec(input: any): UniversalSpec;
