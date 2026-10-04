<!--
  widgets/craft/PageStrip.svelte
  The pages of a multi-page design as thumbnails: a horizontal strip under the
  canvas, or (the grid toggle) a wrapping grid of larger pages. On `./ui` only.

  - The current page is marked (aria-selected + an accent ring); a click or the
    arrow keys select (`onselect`, `current` is bindable). While `current` is not
    in `pages` (a page just added or deleted) the first page is shown as current,
    but `current` is never rewritten: the host owns it.
  - "+" adds a page after the current one (`onadd(index)`), drag reorders
    (`onmove(id, index)`, the index it should hold afterwards; maths in
    page-strip.ts), and Alt+Left/Right moves the focused page by one.
  - Right-click (or Shift+F10) opens a menu with Duplicate and Delete. Its items
    act only on a real click (press and release on the item) or the keyboard: the
    opening gesture's own release, which lands on the first item when the menu
    opens under the pointer (a quick right-click, a two-finger tap), never picks.
  - Each control renders only when its handler is passed, like Tree's layer
    mode; Delete is disabled on the last page. The host owns the page list.
  - Thumbnails: the `thumbnail` snippet, else `thumb` (an image), else a blank
    page, all at the page's aspect ratio. Strip pages are 56px tall, grid 128px.
  role="listbox" (horizontal) of options with roving tabindex. Tokens only.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import { PAGE_MIME, reorderIndex, type PageItem } from './page-strip.js';

  interface Props {
    pages: PageItem[];
    /** Current page id. Bindable; defaults to the first page. */
    current?: string;
    /** Bindable. */
    view?: 'strip' | 'grid';
    onselect?: (id: string) => void;
    /** Add a page at this index (after the current page). */
    onadd?: (index: number) => void;
    /** Move page `id` so it ends up at `index`. */
    onmove?: (id: string, index: number) => void;
    onduplicate?: (id: string) => void;
    ondelete?: (id: string) => void;
    thumbnail?: Snippet<[PageItem, number]>;
    label?: string;
    class?: string;
  }

  let {
    pages,
    current = $bindable(),
    view = $bindable('strip'),
    onselect,
    onadd,
    onmove,
    onduplicate,
    ondelete,
    thumbnail,
    label = 'Pages',
    class: className,
  }: Props = $props();

  let root = $state<HTMLElement | null>(null);
  const grid = $derived(view === 'grid');
  const thumbH = $derived(grid ? 128 : 56);
  /* The page shown as current: the host's, or the first page while the host's is not in the list
     (a page just added, before the host's list catches up). Never written back to `current`, so the
     host's value wins as soon as its page arrives. */
  const active = $derived(pages.some((p) => p.id === current) ? current : pages[0]?.id);
  const index = $derived(Math.max(0, pages.findIndex((p) => p.id === active)));
  const hasMenu = $derived(!!(onduplicate || ondelete));

  let drag = $state<{ id: string; over: number; after: boolean } | null>(null);

  const name = (p: PageItem, i: number) => p.label ?? `Page ${i + 1}`;
  const thumbW = (p: PageItem) => Math.round(thumbH * (p.width && p.height ? Math.min(3, Math.max(0.5, p.width / p.height)) : 1));

  /** The context-menu trigger's props with our handlers chained after its own. */
  function withHandlers(props: Record<string, unknown>, own: Record<string, (e: never) => void>) {
    const out: Record<string, unknown> = { ...props };
    for (const [k, fn] of Object.entries(own)) {
      const prev = props[k];
      out[k] = typeof prev === 'function' ? (e: never) => (prev(e), fn(e)) : fn;
    }
    return out;
  }

  /* bits-ui turns a pointerup with no pointerdown on the item into a click, so the release of
     the right-click that opened the menu would select the item under it. Cancelling it leaves
     selection to the native click (down and up on the item) and Enter/Space. */
  const deliberate = (e: PointerEvent) => e.preventDefault();

  function select(id: string) {
    current = id;
    onselect?.(id);
  }

  function focusPage(id: string) {
    queueMicrotask(() => [...(root?.querySelectorAll<HTMLElement>('[data-page]') ?? [])].find((el) => el.dataset.page === id)?.focus());
  }

  function onkeydown(e: KeyboardEvent, i: number) {
    const back = e.key === 'ArrowLeft' || (grid && e.key === 'ArrowUp');
    const fwd = e.key === 'ArrowRight' || (grid && e.key === 'ArrowDown');
    if (e.altKey && onmove && (back || fwd)) {
      const to = i + (fwd ? 1 : -1);
      if (to < 0 || to >= pages.length) return;
      e.preventDefault();
      onmove(pages[i].id, to);
      focusPage(pages[i].id);
      return;
    }
    let next = -1;
    if (back) next = Math.max(0, i - 1);
    else if (fwd) next = Math.min(pages.length - 1, i + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = pages.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') next = i;
    if (next < 0) return;
    e.preventDefault();
    select(pages[next].id);
    focusPage(pages[next].id);
  }

  function ondragstart(e: DragEvent, p: PageItem, i: number) {
    if (!onmove || !e.dataTransfer) return;
    e.dataTransfer.setData(PAGE_MIME, p.id);
    e.dataTransfer.effectAllowed = 'move';
    drag = { id: p.id, over: i, after: false };
  }

  function ondragover(e: DragEvent, i: number) {
    if (!drag || !Array.from(e.dataTransfer?.types ?? []).includes(PAGE_MIME)) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.over = i;
    drag.after = e.clientX > r.left + r.width / 2;
  }

  function ondrop(e: DragEvent, i: number) {
    if (!drag || !onmove) return;
    e.preventDefault();
    const from = pages.findIndex((p) => p.id === drag!.id);
    const to = reorderIndex(from, i, drag.after);
    if (from >= 0 && to !== null) onmove(drag.id, to);
    drag = null;
  }
</script>

{#snippet option(p: PageItem, i: number, menuProps: Record<string, unknown> = {})}
  {@const selected = p.id === active}
  {@const marker = drag && drag.over === i && drag.id !== p.id ? (drag.after ? 'after' : 'before') : undefined}
  <div
    {...withHandlers(menuProps, {
      onclick: () => select(p.id),
      onkeydown: (e: KeyboardEvent) => onkeydown(e, i),
      ondragstart: (e: DragEvent) => ondragstart(e, p, i),
      ondragover: (e: DragEvent) => ondragover(e, i),
      ondrop: (e: DragEvent) => ondrop(e, i),
      ondragend: () => (drag = null),
    })}
    role="option"
    aria-selected={selected}
    aria-label={name(p, i)}
    tabindex={selected ? 0 : -1}
    draggable={onmove ? 'true' : undefined}
    data-page={p.id}
    data-drop={marker}
    class={cn(
      'page-thumb group relative flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg p-1 outline-none focus-visible:outline-2 focus-visible:outline-ripple-ring',
      drag?.id === p.id && 'opacity-50',
    )}
  >
    <span
      class={cn(
        'block overflow-hidden rounded-md bg-ripple-muted ring-1 transition-shadow duration-150 ease-ripple-out motion-reduce:transition-none',
        selected ? 'ring-2 ring-ripple-accent' : 'ring-ripple-border group-hover:ring-ripple-surface-foreground/30',
      )}
      style:width="{thumbW(p)}px"
      style:height="{thumbH}px"
    >
      {#if thumbnail}
        {@render thumbnail(p, i)}
      {:else if p.thumb}
        <img src={p.thumb} alt="" loading="lazy" decoding="async" draggable="false" class="size-full object-contain" />
      {/if}
    </span>
    <span class={cn('text-[11px] tabular-nums leading-none', selected ? 'font-semibold text-ripple-accent' : 'text-ripple-muted-foreground')}>{i + 1}</span>
  </div>
{/snippet}

{#snippet page(p: PageItem, i: number)}
  {#if hasMenu}
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {#snippet child({ props })}{@render option(p, i, props)}{/snippet}
      </ContextMenu.Trigger>
      <ContextMenu.Content class="w-44">
        {#if onduplicate}
          <ContextMenu.Item onpointerup={deliberate} onSelect={() => onduplicate(p.id)}><CopyIcon size={14} aria-hidden="true" />Duplicate page</ContextMenu.Item>
        {/if}
        {#if ondelete}
          <ContextMenu.Item onpointerup={deliberate} disabled={pages.length < 2} onSelect={() => ondelete(p.id)}><TrashIcon size={14} aria-hidden="true" />Delete page</ContextMenu.Item>
        {/if}
      </ContextMenu.Content>
    </ContextMenu.Root>
  {:else}
    {@render option(p, i)}
  {/if}
{/snippet}

<div bind:this={root} data-slot="page-strip" data-view={view} class={cn('flex min-w-0 flex-col', className)}>
  <div class={cn('flex min-w-0 items-center gap-2 px-3', grid ? 'pt-2 pb-1' : 'py-1.5')}>
    <span class="shrink-0 text-[12px] font-medium text-ripple-muted-foreground">
      {label} <span class="tabular-nums">{index + 1}/{pages.length}</span>
    </span>
    {#if !grid}
      {@render list()}
    {:else}
      <span class="flex-1"></span>
    {/if}
    <button
      type="button"
      aria-pressed={grid}
      aria-label="Show all pages"
      title="Show all pages"
      onclick={() => (view = grid ? 'strip' : 'grid')}
      class={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ease-ripple-out focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none',
        grid ? 'bg-ripple-accent/10 text-ripple-accent' : 'text-ripple-muted-foreground hover:bg-ripple-muted hover:text-ripple-surface-foreground',
      )}
    >
      <LayoutGridIcon size={18} aria-hidden="true" />
    </button>
  </div>
  {#if grid}
    <div class="max-h-[50vh] overflow-y-auto px-3 pb-3">{@render list()}</div>
  {/if}
</div>

{#snippet list()}
  <div class={cn('flex min-w-0 items-center gap-1', grid ? 'flex-wrap content-start gap-2' : 'flex-1 overflow-x-auto [scrollbar-width:thin]')}>
    <div role="listbox" aria-label={label} aria-orientation={grid ? undefined : 'horizontal'} class={cn('flex items-end gap-1', grid && 'flex-wrap gap-2')}>
      {#each pages as p, i (p.id)}
        {@render page(p, i)}
      {/each}
    </div>
    {#if onadd}
      <button
        type="button"
        aria-label="Add page"
        title="Add page"
        onclick={() => onadd(index + 1)}
        class="mb-[18px] flex shrink-0 items-center justify-center rounded-lg border border-dashed border-ripple-border text-ripple-muted-foreground transition-colors duration-150 ease-ripple-out hover:border-ripple-accent hover:text-ripple-accent focus-visible:outline-2 focus-visible:outline-ripple-ring motion-reduce:transition-none"
        style:width="{grid ? 96 : 44}px"
        style:height="{thumbH}px"
      >
        <PlusIcon size={grid ? 22 : 18} aria-hidden="true" />
      </button>
    {/if}
  </div>
{/snippet}

<style>
  .page-thumb[data-drop='before']::before,
  .page-thumb[data-drop='after']::after {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 18px;
    width: 2px;
    border-radius: 1px;
    background: var(--ripple-accent);
  }
  .page-thumb[data-drop='before']::before {
    left: -2px;
  }
  .page-thumb[data-drop='after']::after {
    right: -2px;
  }
</style>
