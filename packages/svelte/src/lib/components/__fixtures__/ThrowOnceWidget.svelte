<!--
  src/lib/components/__fixtures__/ThrowOnceWidget.svelte
  Test fixture (RCR-4 reset path): throws on the FIRST render only, via a
  module-level flag the test can re-arm. Used to prove the boundary's
  "Try again" action actually resets and re-renders the subtree — the exact
  behavior that once shipped as a dead button. Excluded from the published
  package via the package.json `files` allowlist.
-->
<script lang="ts" module>
  export const state = { armed: true };
</script>

<script lang="ts">
  if (state.armed) {
    state.armed = false;
    throw new Error('transient failure: first render only');
  }
</script>

<div data-testid="recovered">recovered</div>
