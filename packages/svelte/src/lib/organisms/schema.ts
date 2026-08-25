/**
 * organisms/schema.ts — RIPPLE-NATIVE organism schema (Wave 2: organisms).
 * Created 2026-06-07.
 * Adapted from ocean-flow's organisms/schema.ts. Keeps the domain-agnostic
 * organisms only (option-list, form-section, results-summary, quiz-question,
 * sources-row) — the genesis product-card was dropped (commerce-specific, ships
 * per-vertical later). zod-free by design: ripple's intent layer validates at the
 * NodeRenderer boundary, so organisms only need the OrganismType union + the
 * organism-ref shape a spec uses to reference an organism by name.
 *
 * This is the 3rd dispatch tier's contract:
 *   - widgets  → NodeRenderer (raw widget tree)
 *   - layouts  → IntentRenderer (intent='form'|'summary'|…)
 *   - organisms→ OrganismRenderer (this) — `{ organism, props }` references.
 */

/** The organism keys OrganismRenderer can dispatch. */
export const ORGANISM_TYPES = [
  'option-list',
  'form-section',
  'results-summary',
  'quiz-question',
  'sources-row',
] as const;

export type OrganismType = (typeof ORGANISM_TYPES)[number];

/** A spec-level reference to an organism: render `organism` with `props`. */
export interface OrganismRef {
  organism: OrganismType;
  props: Record<string, unknown>;
}

/** Narrowing guard for untrusted spec input. */
export function isOrganismType(value: unknown): value is OrganismType {
  return (
    typeof value === 'string' &&
    (ORGANISM_TYPES as readonly string[]).includes(value)
  );
}
