<!--
  @file widgets/motion/Reveal.svelte
  @description Sugar widget: a container that reveals on scroll-into-view.
    Desugars to an inView motion applied via use:withMotion. The author writes
    { type: 'reveal', children: [...] } instead of a hand-written motion field.
  @created 2026-05-30 — RFC 12 animation primitive.
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
    /** Travel direction. Default 'up' (slides up from 24px below). */
    direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
    /** Reveal only the first time it enters the viewport. Default true. */
    once?: boolean;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, direction = 'up', once = true, children, hasChildren = false }: Props = $props();

  const OFFSETS: Record<NonNullable<Props['direction']>, { x?: number; y?: number }> = {
    up: { y: 24 }, down: { y: -24 }, left: { x: 24 }, right: { x: -24 }, fade: {},
  };
  // svelte-ignore state_referenced_locally
  const motion: Motion = {
    inView: { opacity: 0, ...OFFSETS[direction], once, amount: 0.2 } as Motion['inView'],
    transition: { preset: 'smooth' },
    reduceMotion: 'cross-fade',
  };
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<div {id} class={cn('block', className)} style={styleString} data-ripple-motion use:withMotion={motion}>
  {#if hasChildren && children}{@render children()}{/if}
</div>
