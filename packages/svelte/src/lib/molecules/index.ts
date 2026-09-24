/**
 * molecules/index.ts — RIPPLE-NATIVE molecules barrel (Wave 1: molecules).
 * Created 2026-06-07.
 *
 * Molecules are reusable mid-level compositions BETWEEN raw widgets and
 * layouts (atomic-design "molecules"). They are pure presentation — props in,
 * UI out — built entirely on ripple's own widgets and design tokens. Wave 2
 * (organisms) and Wave 3 (layouts) compose these.
 *
 * Atomic-design layers in ripple:
 *   - Atoms / widgets → src/lib/widgets/ (185 widgets)
 *   - Molecules       → this directory
 *   - Organisms       → (Wave 2)
 *   - Layouts         → src/lib/intent/layouts/
 *
 * Newly built here: PriceTag, SelectionIndicator, ItemCard.
 * Re-exported (reused, NOT re-ported) so organisms can import the molecule
 * layer uniformly: Rating (from widgets/input) and SourceCard (from
 * widgets/research). Importing those straight from widgets/ is equally valid.
 */

export { default as ItemCard } from './ItemCard.svelte';
export { default as PriceTag } from './PriceTag.svelte';
export { default as SelectionIndicator } from './SelectionIndicator.svelte';

// Reused ripple widgets surfaced under the molecules namespace.
export { default as Rating } from '$lib/widgets/input/Rating.svelte';
export { default as SourceCard } from '$lib/widgets/research/SourceCard.svelte';
