<!--
  OrganismRenderer.svelte — RIPPLE-NATIVE organism dispatcher (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/OrganismRenderer.svelte. Rewired to ripple's
  organism set and Svelte 5 dynamic-component idiom (capitalised derived component
  used directly, like NodeRenderer's WidgetComponent — no deprecated
  <svelte:component>). Callbacks are mapped per-organism instead of genesis's
  spread-everything approach, so each organism only receives the events it owns.

  The 3rd dispatch tier alongside NodeRenderer (widgets) and IntentRenderer
  (layouts): given `{ organism, props }` it renders the matching organism. Lets a
  spec reference an organism by name instead of inlining a full widget tree. Pure
  presentation — props in, UI out. No data fetching.
-->
<script lang="ts">
  import OptionList from './OptionList.svelte';
  import FormSection from './FormSection.svelte';
  import ResultsSummary from './ResultsSummary.svelte';
  import QuizQuestion from './QuizQuestion.svelte';
  import SourcesRow from './SourcesRow.svelte';
  import type { OrganismType } from './schema.js';

  interface Props {
    organism: OrganismType;
    props?: Record<string, unknown>;
    /** Fired when the organism completes a user action (select/answer/etc.). */
    onComplete?: (data: unknown) => void;
  }

  let { organism, props = {}, onComplete }: Props = $props();

  const ORGANISMS = {
    'option-list': OptionList,
    'form-section': FormSection,
    'results-summary': ResultsSummary,
    'quiz-question': QuizQuestion,
    'sources-row': SourcesRow,
  } as const;

  // Cast the union of concrete organism components to a generic component type:
  // spreading `{...props} {...handlers}` cannot satisfy every member's Props at once
  // (e.g. OptionList requires `options`), and the runtime contract is "pass through
  // whatever this organism needs". Updated 2026-07-08 for svelte-check.
  const Component = $derived(
    ORGANISMS[organism] as unknown as import('svelte').Component<Record<string, unknown>>,
  );

  // Per-organism callback wiring. Each organism gets only the event it owns,
  // all funnelled through onComplete so the host has a single completion hook.
  const handlers = $derived.by(() => {
    switch (organism) {
      case 'option-list':
        return { onSelect: (id: string) => onComplete?.({ selected: id }) };
      case 'quiz-question':
        return {
          onAnswer: (id: string, correct: boolean) =>
            onComplete?.({ id, correct }),
        };
      case 'form-section':
        return {
          onChange: (id: string, value: unknown) =>
            onComplete?.({ field: id, value }),
        };
      case 'sources-row':
        return { onSourceClick: (source: unknown) => onComplete?.({ source }) };
      default:
        return {};
    }
  });
</script>

{#if Component}
  <Component {...props} {...handlers} />
{:else}
  <div
    class="rounded-ripple border border-ripple-error/30 bg-ripple-error/10 p-4 text-sm text-ripple-error"
    role="alert"
  >
    Unknown organism: {organism}
  </div>
{/if}
