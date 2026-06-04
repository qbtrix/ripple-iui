<!--
  @file widgets/marketing/Footer.svelte
  @description Marketing footer: optional brand block + link columns + a
    divided copyright row. Layout + text.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Visual polish: optional `brand` + `tagline` lead
    block, link columns sit alongside it on wide screens, and the copyright
    now sits under a hairline divider with more breathing room. New props are
    optional/additive; columns/copyright unchanged. SSR-safe.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface FooterLink { label: string; href: string; }
  interface FooterColumn { title: string; links: FooterLink[]; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    columns?: FooterColumn[]; copyright?: string;
    /** Optional brand name shown in a lead block on the left. */
    brand?: string;
    /** Optional one-line tagline under the brand. */
    tagline?: string;
  }
  let { id, class: className, style, columns = [], copyright, brand, tagline }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
  const hasTop = $derived(Boolean(brand) || columns.length > 0);
</script>

<footer {id} class={cn('w-full border-t border-border px-6 py-12 flex flex-col gap-10', className)} style={styleString}>
  {#if hasTop}
    <div class="flex flex-col gap-10 md:flex-row md:justify-between">
      {#if brand}
        <div class="flex max-w-xs flex-col gap-2">
          <span class="text-lg font-semibold tracking-tight">{brand}</span>
          {#if tagline}<p class="text-sm text-muted-foreground leading-relaxed">{tagline}</p>{/if}
        </div>
      {/if}
      {#if columns.length}
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {#each columns as col}
            <div class="flex flex-col gap-3">
              <span class="text-xs font-semibold uppercase tracking-wider text-foreground/80">{col.title}</span>
              {#each col.links as link}
                <a href={link.href} class="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  {#if copyright}
    <div class={cn(hasTop && 'border-t border-border pt-6')}>
      <p class="text-xs text-muted-foreground">{copyright}</p>
    </div>
  {/if}
</footer>
