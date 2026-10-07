<!-- discover/DiscoverEmpty.svelte — what the Discover page shows instead of
     sections: "Nothing here yet" for an empty catalogue, "Nothing matches that
     yet." when a filter or search is on, and the failed-load error. The copy is
     the app's; `actions` is the consumer's call to action (Publish, Ask Paw,
     Retry). Test ids follow the app: discover-empty, discover-error. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import EmptyState from '../widgets/display/EmptyState.svelte';

  let {
    state = 'empty',
    actions,
    class: className,
  }: {
    state?: 'empty' | 'filtered' | 'error';
    actions?: Snippet;
    class?: string;
  } = $props();
</script>

<div class={className} data-testid={state === 'error' ? 'discover-error' : 'discover-empty'}>
  {#if state === 'error'}
    <EmptyState tone="error" title="Discover didn't load." description="Check your connection and try again." {actions} />
  {:else if state === 'filtered'}
    <EmptyState icon="search" title="Nothing matches that yet." description="Try “QR”, “menu” or “game”, or ask Paw to make it." {actions} />
  {:else}
    <EmptyState title="Nothing here yet" description="Be the first: publish something you made with Paw." {actions} />
  {/if}
</div>
