<!--
  @file widgets/marketing/Cta.svelte
  @description Call-to-action band: headline, optional subtext, one button.
  @created 2026-05-30 — RFC 12 marketing widget pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    headline: string; subtext?: string; button?: string; href?: string;
    align?: 'left' | 'center';
  }
  let { id, class: className, style, headline, subtext, button, href = '#', align = 'center' }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<section {id} class={cn('w-full rounded-xl bg-primary text-primary-foreground px-8 py-12 flex flex-col gap-4', align === 'center' && 'items-center text-center', className)} style={styleString}>
  <h2 class="text-2xl md:text-3xl font-semibold tracking-tight">{headline}</h2>
  {#if subtext}<p class="text-base opacity-90 max-w-xl">{subtext}</p>{/if}
  {#if button}<a href={href} class="mt-2 inline-flex rounded-md bg-background text-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">{button}</a>{/if}
</section>
