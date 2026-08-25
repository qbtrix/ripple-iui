<!-- src/lib/widgets/display/Kbd.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    keys: string | string[];
    separator?: string;
  }

  let { id, class: className, style, keys, separator = '+' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const list = $derived(Array.isArray(keys) ? keys : [keys]);

  const baseClass =
    'inline-flex items-center justify-center min-w-[1.5em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[11px] font-mono leading-none text-muted-foreground shadow-[inset_0_-1px_0_0_var(--border)]';
</script>

<span {id} class={cn('inline-flex items-center gap-1', className)} style={styleString}>
  {#each list as key, i (i)}
    <kbd class={baseClass}>{key}</kbd>
    {#if i < list.length - 1}
      <span class="text-[11px] text-muted-foreground">{separator}</span>
    {/if}
  {/each}
</span>
