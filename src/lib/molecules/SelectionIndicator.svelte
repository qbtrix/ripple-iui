<!--
  SelectionIndicator.svelte — RIPPLE-NATIVE molecule (Wave 1: molecules).
  Created 2026-06-07.
  Adapted from ocean-flow's molecules/SelectionIndicator.svelte, rewired to
  ripple's Icon widget + ripple-accent tokens and Tailwind utilities.

  The checkbox/radio visual for selectable items:
    - mode="multiple" → a rounded checkbox showing a Check when selected.
    - mode="single"   → a radio with a filled inner dot when selected.
  Reflects the `selected` prop only — pure presentation, no state of its own,
  no events. The owning organism/layout drives selection.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';

  interface Props {
    selected?: boolean;
    /** 'multiple' → checkbox/check; 'single' → radio/dot. */
    mode?: 'single' | 'multiple';
    size?: 'sm' | 'md';
    class?: string;
  }

  let {
    selected = false,
    mode = 'multiple',
    size = 'md',
    class: className = '',
  }: Props = $props();

  const box = $derived(size === 'sm' ? 'h-5 w-5' : 'h-6 w-6');
  const iconSize = $derived(size === 'sm' ? 12 : 14);
  const dot = $derived(size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5');
  const radius = $derived(mode === 'single' ? 'rounded-full' : 'rounded-md');
</script>

<div
  class={cn(
    'flex shrink-0 items-center justify-center border-2 transition-colors',
    box,
    radius,
    selected
      ? 'border-ripple-accent bg-ripple-accent'
      : 'border-muted-foreground/30 bg-transparent',
    className,
  )}
  role={mode === 'single' ? 'radio' : 'checkbox'}
  aria-checked={selected}
>
  {#if selected}
    {#if mode === 'single'}
      <span class={cn('rounded-full bg-ripple-accent-foreground', dot)}></span>
    {:else}
      <Icon name="check" size={iconSize} class="text-ripple-accent-foreground" />
    {/if}
  {/if}
</div>
