<!-- src/lib/widgets/display/Icon.svelte -->
<script lang="ts">
  import type { Component } from 'svelte';
  import * as iconMap from '@lucide/svelte';
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

  function pascalCase(slug: string): string {
    return slug
      .split(/[-_]/g)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() + p.slice(1).toLowerCase())
      .join('');
  }

  const lookup = iconMap as unknown as Record<string, Component>;

  const IconComponent = $derived.by<Component | null>(() => {
    if (!name) return null;
    // Try exact PascalCase first (e.g. "chevron-right" -> "ChevronRight").
    const direct = lookup[pascalCase(name)];
    if (direct) return direct;
    // Fall back to "Icon" suffix variant (lucide v0 export style).
    const suffixed = lookup[`${pascalCase(name)}Icon`];
    if (suffixed) return suffixed;
    return null;
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
