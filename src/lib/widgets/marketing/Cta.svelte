<!--
  @file widgets/marketing/Cta.svelte
  @description Call-to-action band: headline, optional subtext, primary +
    optional secondary button.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Polished conversion band: soft radial-glow background
    layer, optional `eyebrow` kicker, larger headline, and an optional
    `secondaryButton`/`secondaryHref` ghost button. All new props are
    optional/additive; headline/subtext/button/href/align are unchanged.
    SSR-safe (pure markup + CSS).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    headline: string; subtext?: string; button?: string; href?: string;
    align?: 'left' | 'center';
    /** Optional small kicker above the headline. */
    eyebrow?: string;
    /** Optional secondary (ghost) button. */
    secondaryButton?: string;
    secondaryHref?: string;
  }
  let { id, class: className, style, headline, subtext, button, href = '#', align = 'center', eyebrow, secondaryButton, secondaryHref = '#' }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<section {id} class={cn('relative w-full overflow-hidden rounded-2xl bg-primary text-primary-foreground px-8 py-14 flex flex-col gap-4', align === 'center' && 'items-center text-center', className)} style={styleString}>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-60" style="background:radial-gradient(60% 120% at 50% 0%, color-mix(in oklab, var(--color-primary-foreground, #fff) 18%, transparent), transparent 70%)"></div>
  <div class={cn('relative flex flex-col gap-4', align === 'center' && 'items-center')}>
    {#if eyebrow}<span class="text-xs font-medium uppercase tracking-wider opacity-80">{eyebrow}</span>{/if}
    <h2 class="text-2xl md:text-4xl font-semibold tracking-tight">{headline}</h2>
    {#if subtext}<p class="text-base md:text-lg opacity-90 max-w-xl">{subtext}</p>{/if}
    {#if button || secondaryButton}
      <div class={cn('mt-3 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
        {#if button}<a href={href} class="inline-flex items-center rounded-md bg-background text-foreground px-5 py-2.5 text-sm font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">{button}</a>{/if}
        {#if secondaryButton}<a href={secondaryHref} class="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-primary-foreground/10">{secondaryButton}</a>{/if}
      </div>
    {/if}
  </div>
</section>
