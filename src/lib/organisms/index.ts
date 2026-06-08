/**
 * organisms/index.ts — RIPPLE-NATIVE organisms barrel (Wave 2: organisms).
 * Created 2026-06-07.
 *
 * Organisms are domain-agnostic compositions of molecules + widgets that the
 * layouts (Wave 3) reuse. Built RIPPLE-NATIVE on src/lib/molecules + ripple
 * widgets and design tokens. Pure presentation — props in, UI out.
 *
 * Atomic-design layers in ripple:
 *   - Atoms / widgets → src/lib/widgets/ (185 widgets)
 *   - Molecules       → src/lib/molecules/
 *   - Organisms       → this directory
 *   - Layouts         → src/lib/intent/layouts/
 *
 * Built here: OptionList, FormSection, ResultsSummary, QuizQuestion, SourcesRow,
 * plus OrganismRenderer (the registry/dispatcher) and the OrganismType union.
 */

export { default as OptionList } from './OptionList.svelte';
export { default as FormSection } from './FormSection.svelte';
export { default as ResultsSummary } from './ResultsSummary.svelte';
export { default as QuizQuestion } from './QuizQuestion.svelte';
export { default as SourcesRow } from './SourcesRow.svelte';
export { default as OrganismRenderer } from './OrganismRenderer.svelte';

export {
  ORGANISM_TYPES,
  isOrganismType,
  type OrganismType,
  type OrganismRef,
} from './schema.js';
