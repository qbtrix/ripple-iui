<!-- src/lib/widgets/display/Code.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let { id, class: className, style, value, children, hasChildren = false }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<code
  {id}
  class={cn('px-1 py-0.5 rounded bg-muted text-[0.875em] font-mono text-foreground', className)}
  style={styleString}
>
  {#if hasChildren && children}
    {@render children()}
  {:else if value}
    {value}
  {/if}
</code>
