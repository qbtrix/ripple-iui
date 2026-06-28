<!--
  design-system-roundtrip-harness.test.svelte — SP-3 repro fixture (NOT shipped;
  .test.svelte is excluded from the package). Mirrors the LIVE lab data flow: the
  brand is held in Svelte `$state` (a deep proxy) and the editor writes back via
  onChange (brand = next). This is the condition the unit test missed (it fed a
  plain object). The <output> exposes the live brand's primary color so the test
  can assert the edit actually reached state.
  @created 2026-06-28 — SP-3 bug repro (primary color not applying).
-->
<script lang="ts">
  import DesignSystemEditor from './DesignSystemEditor.svelte';
  import { defaultBrandPack } from './brand-defaults.js';
  import type { BrandPack } from '../../schema/brand.js';

  let brand = $state<BrandPack>(defaultBrandPack());
</script>

<DesignSystemEditor {brand} mode="light" onChange={(next) => (brand = next)} />
<output data-testid="primary-out">{brand.tokens?.color?.primary?.light ?? ''}</output>
