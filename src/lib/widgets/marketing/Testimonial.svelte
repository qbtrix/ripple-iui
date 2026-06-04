<!--
  @file widgets/marketing/Testimonial.svelte
  @description Single testimonial card: quote, author, role, optional avatar.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Richer card: opening quotation mark, larger quote
    type, avatar OR an auto-generated initials circle when no avatar is
    given, and an optional `rating` (1-5) that renders lucide star icons.
    Prop API additive: `rating` is the only new optional prop; existing
    quote/author/role/avatar props are unchanged. SSR-safe (static lucide
    import, no window/onMount).
-->
<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    quote: string; author?: string; role?: string; avatar?: string;
    /** Optional 1-5 star rating rendered above the quote. */
    rating?: number;
  }
  let { id, class: className, style, quote, author, role, avatar, rating }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);

  const initials = $derived(
    (author ?? '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '').join('')
  );
  // Clamp rating to 0-5 and round to a whole number of filled stars.
  const stars = $derived(rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : 0);
</script>

<figure {id} class={cn('flex flex-col gap-4 rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm', className)} style={styleString}>
  {#if stars > 0}
    <div class="flex gap-0.5" aria-label={`${stars} out of 5 stars`}>
      {#each Array(5) as _, i}
        <Star size={16} class={cn('shrink-0', i < stars ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')} />
      {/each}
    </div>
  {/if}
  <blockquote class="relative text-lg leading-relaxed">
    <span aria-hidden="true" class="absolute -left-1 -top-3 select-none font-serif text-4xl leading-none text-primary/20">&ldquo;</span>
    <span class="relative">{quote}</span>
  </blockquote>
  <figcaption class="mt-1 flex items-center gap-3">
    {#if avatar}
      <img src={avatar} alt={author ?? ''} class="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
    {:else if initials}
      <span class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/15" aria-hidden="true">{initials}</span>
    {/if}
    <div class="flex flex-col">
      {#if author}<span class="text-sm font-semibold">{author}</span>{/if}
      {#if role}<span class="text-xs text-muted-foreground">{role}</span>{/if}
    </div>
  </figcaption>
</figure>
