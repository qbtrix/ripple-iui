<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';

  interface NavItem {
    label: string;
    /** Optional lucide icon name (kebab-case, e.g. "home", "settings"). */
    icon?: string;
    href?: string;
    /** Group label — items sharing the same group render under it. */
    group?: string;
    /** When true, render as the active/selected item. */
    active?: boolean;
    /** Optional badge text (e.g., a count). */
    badge?: string;
    /** Optional value used by on_select handler / state binding. */
    value?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    items?: NavItem[];
    /** Currently active value (matched against item.value). */
    value?: string;
    /** Footer slot (e.g., user pill). */
    footer?: Snippet;
    /** Emitted when a non-href item is clicked, with item.value. */
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style,
    title, items = [], value, footer, onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Group items: items sharing `group` cluster together; default group is "".
  const grouped = $derived.by(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of items) {
      const key = item.group ?? '';
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  });

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p, i) => (i === 0 ? p[0]!.toUpperCase() + p.slice(1) : p[0]!.toUpperCase() + p.slice(1)))
      .join('');
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  function isActive(item: NavItem): boolean {
    if (item.active) return true;
    if (value !== undefined && item.value !== undefined) return value === item.value;
    return false;
  }

  function handleClick(item: NavItem) {
    if (item.value !== undefined) onchange?.(item.value);
  }
</script>

<aside
  {id}
  class={cn(
    'flex flex-col gap-3 border-r border-border bg-card/40 p-3',
    'w-56 shrink-0 h-full',
    className
  )}
  style={styleString}
>
  {#if title}
    <div class="px-2 py-1 text-sm font-semibold tracking-tight">{title}</div>
  {/if}

  <nav class="flex flex-col gap-4">
    {#each grouped as [groupName, list] (groupName)}
      <div class="flex flex-col gap-0.5">
        {#if groupName}
          <div class="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {groupName}
          </div>
        {/if}
        {#each list as item, i (item.label + i)}
          {@const ItemIcon = getIcon(item.icon)}
          {@const active = isActive(item)}
          {#if item.href}
            <a
              href={item.href}
              class={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {#if ItemIcon}<ItemIcon size={15} />{/if}
              <span class="flex-1 truncate">{item.label}</span>
              {#if item.badge}
                <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{item.badge}</span>
              {/if}
            </a>
          {:else}
            <button
              type="button"
              onclick={() => handleClick(item)}
              class={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                active
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {#if ItemIcon}<ItemIcon size={15} />{/if}
              <span class="flex-1 truncate">{item.label}</span>
              {#if item.badge}
                <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{item.badge}</span>
              {/if}
            </button>
          {/if}
        {/each}
      </div>
    {/each}
  </nav>

  {#if footer}
    <div class="mt-auto pt-2 border-t border-border">
      {@render footer()}
    </div>
  {/if}
</aside>
