<!--
  src/lib/widgets/display/Code.svelte
  Updated 2026-09-12: the children branch gates on `children` alone, not
  `hasChildren && children`, so a hand-written Svelte caller that passes
  children renders them. Gating on `hasChildren` here would drop the
  fallback branch below; NodeRenderer now only passes `children` when the
  spec node actually has default kids, which makes the snippet truthful.
-->
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
  {#if children}
    {@render children()}
  {:else if value}
    {value}
  {/if}
</code>
