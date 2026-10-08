<!--
  widgets/overlay/CommandPalette.svelte
  One search box over commands AND content: a modal palette that finds editor
  commands, templates, elements and pages by label, aliases, menu path and
  keywords. A registered spec widget (`command-palette`) and on `./ui`.

  - Items are `PaletteItem`s (palette-search.ts): `group` makes the sections,
    ordered by `groups` then first appearance. Ranking lives in palette-search.ts
    and is tuned for a large source; the list renders at most `limit` ranked
    rows and says how many more matched, so 1,600+ items stay fast.
  - Empty query: the `recent` ids first, then the first `groupLimit` items of
    each section with a count of the rest.
  - Async sources: `onquery` fires on every edit and `loading` shows a polite
    "Searching" row; the host updates `commands` when results arrive.
  - Triggers: the global `shortcut` (default mod+k, '' turns it off) toggles it,
    `slash` also opens it on `/` when no text field has focus. `value` is
    bindable, and the widget registry's open/close lets spec flows `invoke` it.
  - It sits near the top of the screen, so it doesn't jump as results shrink.
  - Keyboard: Up/Down wrap, PageUp/PageDown jump 8, Enter picks, Escape closes.
    The input is a combobox with aria-activedescendant over a listbox of grouped
    options; the active row scrolls into view.
  - Rows show a thumbnail (`thumb`) or an icon, the label, the description or
    menu path, and the shortcut. `onselect(id, item)` fires on a pick.
  Tokens only, no colour literals.
-->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as icons from '@lucide/svelte';
  import SearchIcon from '@lucide/svelte/icons/search';
  import type { WidgetRegistry } from '@ripple-ui/core';
  import Kbd from '../display/Kbd.svelte';
  import { isEditableTarget } from '../craft/types.js';
  import { preparePalette, searchPalette, type PaletteItem } from './palette-search.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Whether the palette is open. Bindable. */
    value?: boolean;
    commands?: PaletteItem[];
    /** The search text. Bindable, so a host can prefill it. */
    query?: string;
    placeholder?: string;
    emptyText?: string;
    /** Accessible name of the dialog. */
    label?: string;
    /** Global toggle combo, e.g. "mod+k" (mod = Cmd on macOS, Ctrl elsewhere). '' disables it. */
    shortcut?: string;
    /** Also open on `/` when focus is not in a text field. */
    slash?: boolean;
    /** Section order, by `group` name. Unlisted groups follow. */
    groups?: string[];
    /** Recently used item ids, newest first; shown when the query is empty. */
    recent?: string[];
    recentLabel?: string;
    /** Most ranked rows rendered for a query. */
    limit?: number;
    /** Rows per section when the query is empty. */
    groupLimit?: number;
    loading?: boolean;
    onquery?: (query: string) => void;
    onchange?: (open: boolean) => void;
    onselect?: (id: string, item: PaletteItem) => void;
  }

  let {
    id,
    class: className,
    style,
    value = $bindable(false),
    commands = [],
    query = $bindable(''),
    placeholder = 'Search commands, templates, elements…',
    emptyText = 'No results',
    label = 'Search commands and content',
    shortcut = 'mod+k',
    slash = false,
    groups = [],
    recent = [],
    recentLabel = 'Recent',
    limit = 50,
    groupLimit = 6,
    loading = false,
    onquery,
    onchange,
    onselect,
  }: Props = $props();

  const uid = $props.id();
  const base = $derived(id ?? `ripple-palette-${uid}`);
  const listId = $derived(`${base}-list`);
  const optId = (i: number) => `${base}-opt-${i}`;

  const styleString = $derived(
    style
      ? Object.entries(style)
          .map(([k, v]) => `${k}:${v}`)
          .join(';')
      : undefined,
  );

  let highlight = $state(0);

  function setOpen(open: boolean) {
    value = open;
    onchange?.(open);
    if (!open) query = '';
  }

  // Register open/close on the widget registry so spec flows can `invoke`.
  const widgetRegistry = getContext<WidgetRegistry | undefined>('ui-widget-registry');
  $effect(() => {
    if (!id || !widgetRegistry) return;
    const offOpen = widgetRegistry.register(id, 'open', () => setOpen(true));
    const offClose = widgetRegistry.register(id, 'close', () => setOpen(false));
    return () => {
      offOpen();
      offClose();
    };
  });

  // Global triggers.
  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (shortcut && matchesShortcut(e, shortcut)) {
        e.preventDefault();
        setOpen(!value);
      } else if (slash && !value && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function matchesShortcut(e: KeyboardEvent, combo: string): boolean {
    const parts = combo
      .toLowerCase()
      .split('+')
      .map((p) => p.trim());
    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);
    if (e.key.toLowerCase() !== key) return false;
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    for (const m of mods) {
      if (m === 'mod') {
        if (!(isMac ? e.metaKey : e.ctrlKey)) return false;
      } else if (m === 'ctrl' && !e.ctrlKey) return false;
      else if (m === 'meta' && !e.metaKey) return false;
      else if (m === 'shift' && !e.shiftKey) return false;
      else if (m === 'alt' && !e.altKey) return false;
    }
    return true;
  }

  const index = $derived(preparePalette(commands));

  type Section = { label: string; items: PaletteItem[]; more: number };

  /** Sections in display order; `rows` below is their flattening, in the same order. */
  const view = $derived.by(() => {
    const q = query.trim();
    const order = (names: string[]) => {
      const seen = new Set(groups);
      const extra = names.filter((n) => !seen.has(n) && (seen.add(n), true));
      return [...groups, ...extra];
    };
    const sections: Section[] = [];
    let total = 0;
    let shown = 0;
    if (!q) {
      const byId = new Map(index.map((p) => [p.item.id, p.item]));
      const recents = recent.map((r) => byId.get(r)).filter((x): x is PaletteItem => !!x);
      if (recents.length) sections.push({ label: recentLabel, items: recents, more: 0 });
      const buckets = new Map<string, PaletteItem[]>();
      for (const p of index) {
        const g = p.item.group ?? '';
        if (!buckets.has(g)) buckets.set(g, []);
        buckets.get(g)!.push(p.item);
      }
      for (const g of order([...buckets.keys()])) {
        const all = buckets.get(g);
        if (!all?.length) continue;
        sections.push({ label: g, items: all.slice(0, groupLimit), more: Math.max(0, all.length - groupLimit) });
      }
    } else {
      const found = searchPalette(index, q, limit);
      total = found.total;
      shown = found.items.length;
      const buckets = new Map<string, PaletteItem[]>();
      for (const item of found.items) {
        const g = item.group ?? '';
        if (!buckets.has(g)) buckets.set(g, []);
        buckets.get(g)!.push(item);
      }
      for (const g of order([...buckets.keys()])) {
        const items = buckets.get(g);
        if (items?.length) sections.push({ label: g, items, more: 0 });
      }
    }
    return { sections, total, shown };
  });

  const rows = $derived(view.sections.flatMap((s) => s.items));
  /** Some row has a thumbnail or icon: rows without one keep a blank slot so labels align. */
  const anyMedia = $derived(rows.some((r) => r.thumb || r.icon));

  $effect(() => {
    void query;
    highlight = 0;
  });
  $effect(() => {
    if (highlight > rows.length - 1) highlight = Math.max(0, rows.length - 1);
  });
  $effect(() => {
    if (!value || !rows.length) return;
    document.getElementById(optId(highlight))?.scrollIntoView?.({ block: 'nearest' });
  });

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return (icons as unknown as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  function pick(item: PaletteItem) {
    onselect?.(item.id, item);
    setOpen(false);
  }

  function oninput() {
    onquery?.(query);
  }

  function onKeyDown(e: KeyboardEvent) {
    const n = rows.length;
    if (!n) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight = (highlight + 1) % n;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight = (highlight - 1 + n) % n;
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      highlight = Math.min(highlight + 8, n - 1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      highlight = Math.max(highlight - 8, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = rows[highlight];
      if (item) pick(item);
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-IN');
</script>

<Dialog.Root open={value} onOpenChange={setOpen}>
  <Dialog.Content
    {id}
    showCloseButton={false}
    class={cn('top-[12vh] gap-0 overflow-hidden p-0 translate-y-0 sm:max-w-xl', className)}
    style={styleString}
  >
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    <div class="flex items-center gap-2.5 border-b border-ripple-border px-4 py-3">
      <SearchIcon size={18} class="shrink-0 text-ripple-muted-foreground" aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={rows.length ? optId(highlight) : undefined}
        aria-autocomplete="list"
        aria-label={placeholder}
        autocomplete="off"
        spellcheck="false"
        {placeholder}
        class="h-8 w-full bg-transparent text-[15px] outline-none placeholder:text-ripple-muted-foreground"
        bind:value={query}
        {oninput}
        onkeydown={onKeyDown}
      />
      <Kbd keys="esc" class="hidden sm:inline-flex" />
    </div>

    <div id={listId} role="listbox" aria-label={label} class="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
      {#if loading}
        <div role="status" class="px-3 py-2 text-[13px] text-ripple-muted-foreground">Searching…</div>
      {/if}
      {#if rows.length === 0 && !loading}
        <div class="px-3 py-10 text-center text-sm text-ripple-muted-foreground">{emptyText}</div>
      {:else}
        {@const offsets = view.sections.map((_, si) => view.sections.slice(0, si).reduce((a, s) => a + s.items.length, 0))}
        {#each view.sections as section, si (section.label)}
          <div role="group" aria-labelledby={section.label ? `${base}-g-${si}` : undefined} aria-label={section.label ? undefined : 'Results'}>
            {#if section.label}
              <div id="{base}-g-{si}" class="flex items-baseline gap-2 px-2.5 pt-3 pb-1 text-[12px] font-medium text-ripple-muted-foreground">
                <span>{section.label}</span>
                {#if section.more}<span class="text-[11px] opacity-75">+{fmt(section.more)} more, type to search</span>{/if}
              </div>
            {/if}
            {#each section.items as item, ii (item.id)}
              {@const idx = offsets[si] + ii}
              {@const Icon = item.thumb ? null : getIcon(item.icon)}
              {@const secondary = item.description ?? item.menu}
              <div
                id={optId(idx)}
                role="option"
                tabindex="-1"
                aria-selected={idx === highlight}
                data-highlighted={idx === highlight || undefined}
                onpointermove={() => (highlight = idx)}
                onclick={() => pick(item)}
                onkeydown={(e) => e.key === 'Enter' && pick(item)}
                class={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-100 ease-ripple-out motion-reduce:transition-none',
                  idx === highlight ? 'bg-ripple-muted text-ripple-popover-foreground' : 'text-ripple-popover-foreground/90',
                )}
              >
                {#if item.thumb}
                  <img src={safeUrl(item.thumb, { kind: 'resource' })} alt="" loading="lazy" decoding="async" class="size-9 shrink-0 rounded-md bg-ripple-muted object-cover ring-1 ring-ripple-border" />
                {:else if Icon}
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-ripple-muted/60 text-ripple-muted-foreground">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                {:else if anyMedia}
                  <span class="size-9 shrink-0" aria-hidden="true"></span>
                {/if}
                <span class="min-w-0 flex-1">
                  <span class="block truncate">{item.label}</span>
                  {#if secondary}
                    <span class="block truncate text-[12px] text-ripple-muted-foreground">{secondary}</span>
                  {/if}
                </span>
                {#if item.shortcut}
                  <Kbd keys={item.shortcut} class="ml-auto shrink-0" />
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>

    <div class="flex items-center gap-3 border-t border-ripple-border px-4 py-2 text-[12px] text-ripple-muted-foreground">
      {#if query.trim() && view.total > view.shown}
        <span>Showing {fmt(view.shown)} of {fmt(view.total)}. Keep typing to narrow.</span>
      {:else}
        <span><Kbd keys={['↑', '↓']} separator="" /> to move</span>
        <span><Kbd keys="↵" /> to choose</span>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
