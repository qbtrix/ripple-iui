<!--
  src/lib/components/__fixtures__/ThrowingWidget.svelte
  Test fixture (RCR-4): a widget that throws during render. Registered under a
  custom type by the per-node error-boundary test to prove the boundary catches
  a render failure and shows ErrorState while sibling nodes keep rendering.
  Excluded from the published package via the package.json `files` allowlist.
-->
<script lang="ts">
  throw new Error('poisoned widget: intentional render failure');
</script>
