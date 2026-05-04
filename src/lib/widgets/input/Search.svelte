<!-- src/lib/widgets/input/Search.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import SearchIcon from '@lucide/svelte/icons/search';
  import XIcon from '@lucide/svelte/icons/x';
  import * as icons from '@lucide/svelte';

  type Result = {
    id: string | number;
    label: string;
    description?: string;
    icon?: string;
    /** Group / category label. */
    group?: string;
    /** Optional href for navigation. */
    href?: string;
    /** Optional shortcut hint. */
    shortcut?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Query string. Bind via `bind: "<state-path>"`. */
    value?: string;
    placeholder?: string;
    /** Pre-filtered, ranked results (caller handles fetch / fuzzy match). */
    results?: Result[];
    /** Show dropdown even when query is empty (recent / popular). */
    alwaysShow?: boolean;
    emptyText?: string;
    loading?: boolean;
    onchange?: (q: string) => void;
    oninput?: (q: string) => void;
    onselect?: (id: string | number) => void;
  }

  let {
    id,
    class: className,
    style,
    value = '',
    placeholder = 'Search...',
    results = [],
    alwaysShow = false,
    emptyText = 'No results',
    loading = false,
    onchange,
    oninput,
    onselect
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let focused = $state(false);
  let highlight = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const showDropdown = $derived(focused && (alwaysShow || value.trim().length > 0));

  // Group results.
  const grouped = $derived.by(() => {
    const map = new Map<string, Result[]>();
    for (const r of results) {
      const g = r.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return Array.from(map.entries());
  });

  $effect(() => {
    void value;
    void results.length;
    highlight = 0;
  });

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  function pick(r: Result) {
    onselect?.(r.id);
    if (inputEl) inputEl.blur();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight = Math.min(highlight + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight = Math.max(highlight - 1, 0);
    } else if (e.key === 'Enter') {
      const r = results[highlight];
      if (r) {
        e.preventDefault();
        pick(r);
      }
    } else if (e.key === 'Escape') {
      if (inputEl) inputEl.blur();
    }
  }

  function clear() {
    onchange?.('');
    oninput?.('');
    if (inputEl) inputEl.focus();
  }
</script>

<div
  {id}
  class={cn('relative w-full max-w-md', className)}
  style={styleString}
>
  <div
    class="flex items-center gap-2 rounded-md border border-input bg-ripple-input h-9 px-3 shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]"
  >
    <SearchIcon size={14} class="opacity-60 shrink-0" />
    <input
      bind:this={inputEl}
      type="text"
      role="combobox"
      aria-expanded={showDropdown}
      aria-autocomplete="list"
      {placeholder}
      {value}
      oninput={(e) => {
        const v = (e.target as HTMLInputElement).value;
        oninput?.(v);
        onchange?.(v);
      }}
      onfocus={() => (focused = true)}
      onblur={() => setTimeout(() => (focused = false), 100)}
      onkeydown={onKeyDown}
      class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
    />
    {#if value}
      <button
        type="button"
        class="rounded p-0.5 hover:bg-muted text-muted-foreground"
        aria-label="Clear search"
        onmousedown={(e) => e.preventDefault()}
        onclick={clear}
      >
        <XIcon size={12} />
      </button>
    {/if}
  </div>

  {#if showDropdown}
    <div
      class="absolute left-0 right-0 top-full mt-1 z-50 max-h-[360px] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1"
      role="listbox"
    >
      {#if loading}
        <div class="px-3 py-6 text-center text-sm text-muted-foreground">Searching...</div>
      {:else if results.length === 0}
        <div class="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      {:else}
        {@const flat = new Map(results.map((r, i) => [r.id, i]))}
        {#each grouped as [group, items] (group)}
          {#if group}
            <div class="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </div>
          {/if}
          {#each items as r (r.id)}
            {@const idx = flat.get(r.id) ?? 0}
            {@const isHL = idx === highlight}
            {@const Icon = getIcon(r.icon)}
            <button
              type="button"
              role="option"
              aria-selected={isHL}
              onmouseenter={() => (highlight = idx)}
              onmousedown={(e) => e.preventDefault()}
              onclick={() => pick(r)}
              class={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-colors',
                isHL ? 'bg-muted' : 'hover:bg-muted/60'
              )}
            >
              {#if Icon}<Icon size={14} class="opacity-70 shrink-0" />{/if}
              <span class="flex-1 min-w-0">
                <span class="block truncate">{r.label}</span>
                {#if r.description}
                  <span class="block text-xs text-muted-foreground truncate">{r.description}</span>
                {/if}
              </span>
              {#if r.shortcut}
                <span class="ml-auto text-xs tracking-widest text-muted-foreground">{r.shortcut}</span>
              {/if}
            </button>
          {/each}
        {/each}
      {/if}
    </div>
  {/if}
</div>
