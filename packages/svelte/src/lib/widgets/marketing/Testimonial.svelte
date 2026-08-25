<!--
  @file widgets/marketing/Testimonial.svelte
  @description Single testimonial card: quote, author, role, optional avatar.
  @created 2026-05-30 — RFC 12 marketing widget pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    quote: string; author?: string; role?: string; avatar?: string;
  }
  let { id, class: className, style, quote, author, role, avatar }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<figure {id} class={cn('flex flex-col gap-4 rounded-xl border border-border bg-card text-card-foreground p-6', className)} style={styleString}>
  <blockquote class="text-lg leading-relaxed">"{quote}"</blockquote>
  <figcaption class="flex items-center gap-3">
    {#if avatar}<img src={avatar} alt={author ?? ''} class="h-10 w-10 rounded-full object-cover" />{/if}
    <div class="flex flex-col">
      {#if author}<span class="text-sm font-semibold">{author}</span>{/if}
      {#if role}<span class="text-xs text-muted-foreground">{role}</span>{/if}
    </div>
  </figcaption>
</figure>
