<!-- src/lib/widgets/display/Loading.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import LoaderIcon from '@lucide/svelte/icons/loader-2';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    size?: number;
    label?: string;
    inline?: boolean;
    showLabel?: boolean;
  }

  let {
    id, class: className, style,
    size = 16, label = 'Loading…', inline = false, showLabel = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const wrapperClass = $derived(
    inline
      ? 'inline-flex items-center gap-2'
      : 'flex items-center justify-center gap-2 py-4'
  );
</script>

<span {id} class={cn(wrapperClass, className)} style={styleString} role="status" aria-live="polite">
  <LoaderIcon {size} class="animate-spin text-muted-foreground" aria-hidden="true" />
  {#if showLabel}
    <span class="text-sm text-muted-foreground">{label}</span>
  {:else}
    <span class="sr-only">{label}</span>
  {/if}
</span>
