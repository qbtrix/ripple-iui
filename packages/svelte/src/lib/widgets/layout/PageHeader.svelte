<!--
  PageHeader.svelte
  Updated 2026-09-27 (canon gaps 2): a `titleTrailing` snippet renders inline
  after the title text, vertically centred, before the actions: a status tag
  beside the h1. Without it the title markup is unchanged.
  Updated 2026-09-26 (feature pages canon, F1 / G1): exported on `./ui` for
  hand-written feature pages. Two additive snippets: `leading` (an icon tile or
  avatar before the title) and `toolbar` (a row under the title for search,
  filters and view switches). A `size` prop picks the title: 'md' (20px, list
  pages, the default) or 'sm' (17px, dense tool pages). Colours moved to ripple
  tokens and the subtitle to the 13px rhythm. Existing props and the spec
  renderer's `hasChildren` path are unchanged. No rest-attribute spread on
  purpose: NodeRenderer passes every spec prop through, and a spread would put
  spec strings on the DOM.
  Updated 2026-09-12: body gate is `hasChildren || children` with an optional
  `children?.()` call, so a hand-written Svelte caller that passes children but no
  `hasChildren` renders them. The spec renderer's `hasChildren` path is unchanged.
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
    /** Optional eyebrow text shown above the title (small, uppercase). */
    eyebrow?: string;
    /** 'md' = list-page title (default); 'sm' = dense tool-page title. */
    size?: 'md' | 'sm';
    /** Before the title: an icon tile or an avatar. */
    leading?: Snippet;
    /** Inline after the title text, vertically centred: a status tag. */
    titleTrailing?: Snippet;
    /** Slot for action buttons rendered on the right. Use `slot: "actions"`. */
    actions?: Snippet;
    /** A row under the title: search, filters, view switches. */
    toolbar?: Snippet;
    /** Default body slot rendered below the header (e.g., breadcrumbs, tabs). */
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, subtitle, eyebrow, size = 'md', leading, titleTrailing, actions, toolbar, children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<header
  {id}
  data-page-header
  data-size={size}
  class={cn('flex flex-col gap-3 border-b border-ripple-border pb-4', className)}
  style={styleString}
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex min-w-0 items-center gap-3">
      {#if leading}
        <div data-page-header-leading class="flex shrink-0 items-center">{@render leading()}</div>
      {/if}
      <div class="flex min-w-0 flex-col gap-1">
        {#if eyebrow}
          <span class="text-[11px] font-medium uppercase tracking-wide text-ripple-muted-foreground">{eyebrow}</span>
        {/if}
        {#if titleTrailing}
          <div class="flex min-w-0 items-center gap-2">
          <h1
            class={cn(
              'truncate font-semibold leading-tight tracking-tight text-ripple-surface-foreground',
              size === 'sm' ? 'text-[17px]' : 'text-xl'
            )}
          >{title}</h1>
            <div data-page-header-title-trailing class="flex shrink-0 items-center gap-1.5">{@render titleTrailing()}</div>
          </div>
        {:else}
        <h1
          class={cn(
            'truncate font-semibold leading-tight tracking-tight text-ripple-surface-foreground',
            size === 'sm' ? 'text-[17px]' : 'text-xl'
          )}
        >{title}</h1>
        {/if}
        {#if subtitle}
          <p class="text-[13px] text-ripple-muted-foreground">{subtitle}</p>
        {/if}
      </div>
    </div>
    {#if actions}
      <div class="flex items-center gap-2 shrink-0">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if toolbar}
    <div data-page-header-toolbar class="flex flex-wrap items-center gap-2">{@render toolbar()}</div>
  {/if}
  {#if hasChildren || children}
    <div>{@render children?.()}</div>
  {/if}
</header>
