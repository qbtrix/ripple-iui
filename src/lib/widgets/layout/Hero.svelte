<!--
  @file widgets/layout/Hero.svelte
  @description Landing hero: eyebrow kicker (rendered as a subtle pill),
    large title, subtitle, and a children slot for CTA buttons.
  @updated 2026-06-04 — Polished for marketing Paw Sites: eyebrow now renders
    as a bordered pill, title type scaled up, CTA slot gets more top margin.
    Prop API unchanged (title/subtitle/eyebrow/align/children). SSR-safe.
-->
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
      'inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary',
      align === 'center' && 'mx-auto'
    )}>{eyebrow}</span>
  {/if}
  <h1 class={cn(
    'text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]',
    align === 'center' && 'max-w-3xl'
  )}>{title}</h1>
  {#if subtitle}
    <p class={cn(
      'text-base md:text-lg text-muted-foreground leading-relaxed',
      align === 'center' && 'max-w-xl'
    )}>{subtitle}</p>
  {/if}
  {#if hasChildren && children}
    <div class={cn('mt-3 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
      {@render children()}
    </div>
  {/if}
</section>
