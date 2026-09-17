<!--
  @file widgets/marketing/Footer.svelte
  @description Marketing footer: link columns + copyright. Layout + text.
  @created 2026-05-30 — RFC 12 marketing widget pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface FooterLink { label: string; href: string; }
  interface FooterColumn { title: string; links: FooterLink[]; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    columns?: FooterColumn[]; copyright?: string;
  }
  let { id, class: className, style, columns = [], copyright }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<footer {id} class={cn('w-full border-t border-border px-6 py-10 flex flex-col gap-8', className)} style={styleString}>
  {#if columns.length}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      {#each columns as col}
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{col.title}</span>
          {#each col.links as link}
            <a href={link.href} class="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  {#if copyright}<p class="text-xs text-muted-foreground">{copyright}</p>{/if}
</footer>
