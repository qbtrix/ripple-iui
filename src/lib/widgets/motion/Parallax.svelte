<!--
  @file widgets/motion/Parallax.svelte
  @description Sugar widget: a container whose contents drift on scroll.
    Desugars to a scroll motion applied via use:withMotion.
  @created 2026-05-30 — RFC 12 animation primitive.
  @updated 2026-06-09 — silence state_referenced_locally: the `motion` config
    reads `distance` once at setup (intentional, not reactive).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { withMotion } from '$lib/actions/index.js';
  import type { Motion } from '$lib/schema/motion.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Vertical drift in px across the scroll range. Default 60. */
    distance?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, distance = 60, children, hasChildren = false }: Props = $props();

  // svelte-ignore state_referenced_locally
  const motion: Motion = {
    scroll: { property: 'y', from: distance, to: -distance, range: 'cover' },
    reduceMotion: 'cross-fade',
  };
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<div {id} class={cn('block', className)} style={styleString} data-ripple-motion use:withMotion={motion}>
  {#if hasChildren && children}{@render children()}{/if}
</div>
