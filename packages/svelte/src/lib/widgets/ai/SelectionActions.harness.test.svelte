<!-- SelectionActions.harness.test.svelte — test-only fixture for
     SelectionActions.test.ts (added 2026-09-17, skin-selection). A passage
     inside the component and a paragraph outside it, so a test can select
     across the boundary. `*.test.svelte` is the house fixture name: vitest does
     not collect it and svelte-package does not ship it. `twice` adds a second
     instance, for the shared highlight registry; the outside button is a
     focus target outside the toolbar. -->
<script lang="ts">
  import SelectionActions from './SelectionActions.svelte';

  let {
    onaction,
    disabled = false,
    twice = false,
  }: { onaction?: (e: unknown) => void; disabled?: boolean; twice?: boolean } = $props();
</script>

<p data-testid="outside">Outside the passage.</p>
<button type="button">elsewhere</button>
<SelectionActions {onaction} {disabled}>
  <p data-testid="passage">Churn it first thing Saturday so the batch has time to firm up.</p>
</SelectionActions>
{#if twice}
  <SelectionActions>
    <p data-testid="second">A second passage on the same page.</p>
  </SelectionActions>
{/if}
