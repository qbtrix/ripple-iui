<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    subtitle?: string;
    eyebrow?: string;
    /** "left" (default) or "center". */
    align?: 'left' | 'center';
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, subtitle, eyebrow, align = 'left', children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<section
  {id}
  class={cn(
    'flex flex-col gap-4 py-10',
    align === 'center' && 'items-center text-center',
    className
  )}
  style={styleString}
>
  {#if eyebrow}
    <span class={cn(
      'text-[11px] font-medium uppercase tracking-wider text-primary',
    )}>{eyebrow}</span>
  {/if}
  <h1 class={cn(
    'text-4xl md:text-5xl font-semibold tracking-tight leading-tight',
    align === 'center' && 'max-w-2xl'
  )}>{title}</h1>
  {#if subtitle}
    <p class={cn(
      'text-base md:text-lg text-muted-foreground leading-relaxed',
      align === 'center' && 'max-w-xl'
    )}>{subtitle}</p>
  {/if}
  {#if hasChildren && children}
    <div class={cn('flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
      {@render children()}
    </div>
  {/if}
</section>
