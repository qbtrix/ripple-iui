<!-- discover/DiscoverSearch.svelte — the Discover search box: ripple's Search in
     filter mode with the app's placeholder and width. With `action` it sits in a
     plain GET form (input name `name`, default q; `hidden` carries the other
     filters), so a server-rendered page searches with JS off. Without it, the
     consumer gets each keystroke through `oninput` and does its own debounce. -->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import { cn } from '$lib/utils.js';
  import Search from '../widgets/input/Search.svelte';

  let {
    value = '',
    oninput,
    action,
    name = 'q',
    hidden = {},
    placeholder = 'Search tools, games and sites',
    class: className,
  }: {
    value?: string;
    oninput?: (q: string) => void;
    /** The form's GET target. Set it for a page that must work without JS. */
    action?: string;
    name?: string;
    /** Other query params the form keeps (kind, audience); empty values are dropped. */
    hidden?: Record<string, string | null | undefined>;
    placeholder?: string;
    class?: string;
  } = $props();

  const kept = $derived(Object.entries(hidden).filter((e): e is [string, string] => Boolean(e[1])));
</script>

{#snippet box()}
  <Search
    mode="filter"
    class={cn('max-w-lg [&_input]:placeholder:text-muted-foreground/70', className)}
    {value}
    {oninput}
    {placeholder}
    name={action ? name : undefined}
    aria-label="Search Discover"
    autocomplete="off"
  />
{/snippet}

{#if action}
  <form method="get" action={safeUrl(action)} role="search">
    {#each kept as [key, val] (key)}<input type="hidden" name={key} value={val} />{/each}
    {@render box()}
  </form>
{:else}
  {@render box()}
{/if}
