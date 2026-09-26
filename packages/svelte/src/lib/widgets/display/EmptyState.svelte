<!--
  EmptyState.svelte — dashed-border empty placeholder with an icon, title, description.
  Updated 2026-09-26 (feature pages canon, F1 / G2): additive props for feature
  pages. `icon` also takes a snippet (the string names keep working), `size`
  'sm' is the compact inline variant ('md', the default, is the full-pane one),
  `tone` 'error' paints the icon with the error tokens, defaults it to the alert
  glyph and sets role="alert", and an `actions` snippet renders a CTA row after
  children. Colours moved to ripple tokens; the md layout is unchanged.
  Updated 2026-07-08: widened the `icon` union (+columns/check-square/file-text/clock/table)
  and their $derived mapping so the intent layouts render the real icon instead of hitting a
  type error and falling back to the inbox glyph.
  Updated 2026-09-12: body gate is `hasChildren || children` with an optional
  `children?.()` call, so a hand-written Svelte caller that passes children but no
  `hasChildren` renders them. The spec renderer's `hasChildren` path is unchanged.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import SearchXIcon from '@lucide/svelte/icons/search-x';
  import FileXIcon from '@lucide/svelte/icons/file-x';
  import AlertOctagonIcon from '@lucide/svelte/icons/octagon-alert';
  import ColumnsIcon from '@lucide/svelte/icons/columns';
  import CheckSquareIcon from '@lucide/svelte/icons/check-square';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import TableIcon from '@lucide/svelte/icons/table';

  type IconName = 'inbox' | 'search' | 'file' | 'error' | 'columns' | 'check-square' | 'file-text' | 'clock' | 'table';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    description?: string;
    /** Lucide icon shorthand (inbox / search / file / error, plus layout icons columns / check-square / file-text / clock / table), or a snippet. */
    icon?: IconName | Snippet;
    /** 'md' = full-pane (default); 'sm' = compact, inline in a list or card. */
    size?: 'sm' | 'md';
    /** 'error' = a failed load: error-tinted icon, alert glyph by default, role="alert". */
    tone?: 'default' | 'error';
    /** CTA row (buttons). */
    actions?: Snippet;
    /** Default-slot for CTAs (e.g., a button). */
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, description, icon, size = 'md', tone = 'default', actions, children, hasChildren = false
  }: Props = $props();

  const iconSnippet = $derived(typeof icon === 'function' ? icon : undefined);
  const iconName = $derived<IconName>(
    typeof icon === 'string' ? icon : tone === 'error' ? 'error' : 'inbox'
  );

  const Icon = $derived(
    iconName === 'search' ? SearchXIcon
      : iconName === 'file' ? FileXIcon
      : iconName === 'error' ? AlertOctagonIcon
      : iconName === 'columns' ? ColumnsIcon
      : iconName === 'check-square' ? CheckSquareIcon
      : iconName === 'file-text' ? FileTextIcon
      : iconName === 'clock' ? ClockIcon
      : iconName === 'table' ? TableIcon
      : InboxIcon
  );

  const sm = $derived(size === 'sm');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  data-empty-state
  data-size={size}
  data-tone={tone}
  role={tone === 'error' ? 'alert' : undefined}
  class={cn(
    'flex flex-col items-center justify-center rounded-lg border border-dashed border-ripple-border text-center',
    sm ? 'gap-2 p-4' : 'gap-3 p-8',
    tone === 'error' ? 'bg-ripple-error/5' : 'bg-ripple-muted/20',
    className
  )}
  style={styleString}
>
  <div
    data-empty-icon
    class={cn(
      'flex items-center justify-center rounded-full',
      sm ? 'size-8' : 'size-10',
      tone === 'error' ? 'bg-ripple-error/10 text-ripple-error-text' : 'bg-ripple-muted text-ripple-muted-foreground'
    )}
  >
    {#if iconSnippet}
      {@render iconSnippet()}
    {:else}
      <Icon size={sm ? 16 : 20} />
    {/if}
  </div>
  <div class="flex flex-col gap-1">
    <h3 class={cn('font-semibold text-ripple-surface-foreground', sm ? 'text-[13px]' : 'text-sm')}>{title}</h3>
    {#if description}
      <p class={cn('max-w-sm text-ripple-muted-foreground', sm ? 'text-[12px]' : 'text-sm')}>{description}</p>
    {/if}
  </div>
  {#if hasChildren || children}
    <div class="mt-1">{@render children?.()}</div>
  {/if}
  {#if actions}
    <div data-empty-actions class="mt-1 flex flex-wrap items-center justify-center gap-2">{@render actions()}</div>
  {/if}
</div>
