<!-- discover/DiscoverEmpty.svelte — what the Discover page shows instead of
     sections: "Nothing here yet" for an empty catalogue, "Nothing matches that
     yet." when a filter or search is on, and the failed-load error. `title` and
     `description` replace the state's default copy; the defaults name the
     product "Paw OS", never a bare "Paw". `actions` is the consumer's call to
     action (Publish, Ask Paw OS, Retry). Test ids follow the app:
     discover-empty, discover-error. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import EmptyState from '../widgets/display/EmptyState.svelte';

  let {
    state = 'empty',
    title,
    description,
    actions,
    class: className,
  }: {
    state?: 'empty' | 'filtered' | 'error';
    title?: string;
    description?: string;
    actions?: Snippet;
    class?: string;
  } = $props();

  const COPY = {
    empty: { title: 'Nothing here yet', description: 'Be the first: publish something you made with Paw OS.' },
    filtered: { title: 'Nothing matches that yet.', description: 'Try “QR”, “menu” or “game”, or ask Paw OS to make it.' },
    error: { title: "Discover didn't load.", description: 'Check your connection and try again.' },
  } as const;
</script>

<div class={className} data-testid={state === 'error' ? 'discover-error' : 'discover-empty'}>
  <EmptyState
    tone={state === 'error' ? 'error' : undefined}
    icon={state === 'filtered' ? 'search' : undefined}
    title={title ?? COPY[state].title}
    description={description ?? COPY[state].description}
    {actions}
  />
</div>
