<!-- FineTuneCard.bind.test.svelte — test-only fixture for FineTuneCard.test.ts
     (added 2026-09-17, skin-selection). Binds `values`, `layout` and `type` so
     the test can prove the two-way path, and echoes them where it can read
     them. `*.test.svelte` is the house fixture name: vitest does not collect it
     and svelte-package does not ship it. -->
<script lang="ts">
  import FineTuneCard from './FineTuneCard.svelte';

  let values = $state<Record<string, number>>({ width: 120 });
  let layout = $state('row');
  let type = $state('');
</script>

<FineTuneCard bind:values bind:layout bind:type />
<output data-testid="echo">{JSON.stringify({ values, layout, type })}</output>
<button type="button" onclick={() => (values = { ...values, radius: 12 })}>agent sets radius</button>
