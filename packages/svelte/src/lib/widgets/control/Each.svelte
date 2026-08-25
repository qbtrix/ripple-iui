<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { items?: any[]; children?: Snippet; }
  let { children }: Props = $props();
</script>
{@render children?.()}
