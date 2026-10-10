<!--
  src/lib/components/__fixtures__/NeedsThreeItemsWidget.svelte
  Test fixture (streaming boundary): throws while `items` is not an array of
  exactly three, renders a list once it is. The throw lives in a $derived the
  template reads, so it fires on every props update, not only at mount: a
  half-streamed spec makes it throw, the completed spec makes it render.
  Excluded from the published package via the package.json `files` allowlist.
-->
<script lang="ts">
  let { items }: { items?: unknown } = $props();

  const list = $derived.by(() => {
    if (!Array.isArray(items) || items.length !== 3) {
      throw new Error(`needs three items, got ${Array.isArray(items) ? items.length : typeof items}`);
    }
    return items as string[];
  });
</script>

<ul data-testid="three-items">
  {#each list as item, i (i)}<li>{item}</li>{/each}
</ul>
