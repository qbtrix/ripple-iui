<!-- src/lib/widgets/display/Icon.svelte -->
<script lang="ts">
  import type { Component } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Lucide icon slug (kebab-case), e.g. "chevron-right". */
    name: string;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }

  let { id, class: className, style, name, size = 16, strokeWidth = 2, color }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let IconComponent = $state<Component | null>(null);

  $effect(() => {
    let cancelled = false;
    const target = name;
    IconComponent = null;
    if (!target) return;
    // Vite analyzes this template literal at build-time and code-splits each
    // icon module — tree-shaking is preserved.
    import(`@lucide/svelte/icons/${target}`)
      .then((m) => {
        if (cancelled) return;
        IconComponent = m.default ?? null;
      })
      .catch(() => {
        if (cancelled) return;
        IconComponent = null;
      });
    return () => { cancelled = true; };
  });
</script>

{#if IconComponent}
  <IconComponent {id} class={cn(className)} style={styleString} {size} {strokeWidth} {color} />
{:else}
  <span
    {id}
    class={cn('inline-block', className)}
    style="width:{size}px;height:{size}px;{styleString ?? ''}"
    aria-hidden="true"
  ></span>
{/if}
