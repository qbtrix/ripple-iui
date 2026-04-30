<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Item {
    term: string;
    definition: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items?: Item[];
    /** Layout: "stacked" (term above definition) or "inline" (term/definition in two columns). */
    layout?: 'stacked' | 'inline';
  }

  let {
    id, class: className, style,
    items = [], layout = 'inline'
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<dl
  {id}
  class={cn(
    'text-sm',
    layout === 'inline'
      ? 'grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2'
      : 'flex flex-col gap-3',
    className
  )}
  style={styleString}
>
  {#each items as item}
    {#if layout === 'inline'}
      <dt class="font-medium text-muted-foreground">{item.term}</dt>
      <dd>{item.definition}</dd>
    {:else}
      <div class="flex flex-col gap-0.5">
        <dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.term}</dt>
        <dd>{item.definition}</dd>
      </div>
    {/if}
  {/each}
</dl>
