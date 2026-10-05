<!--
  widgets/craft/EditorShell.svelte
  The layout every craft editor shares (vector, photo, layout), at two densities.
  On `./ui` only (no registry or manifest entry).

    ┌ title ┬─────────── topbar ─────────────┐
    │rail│ left │  children + floating │ right │
    │    │  ⇔   │  prompt              │ ⇔ tabs│
    ├──────────────── pages ─────────────────┤
    └──────────────── status ────────────────┘

  Every region is an optional snippet. `title` never shrinks; `topbar` takes the
  rest of the row, scrolls sideways when crowded, and its root fills the region so
  a host's flex-1 spacer pushes trailing controls right. `left` / `right` are
  resizable px panels (`leftWidth`, `rightWidth`, bindable; `minPanel` 180, the
  right floor `minRight` 240) hidden with `leftOpen` / `rightOpen`. `rightTabs`
  tabs the right panel and `right` gets the active tab id (only that tab mounts).
  `data-slot="editor-center"` wraps the canvas: `relative`, clipping, sized.
  `floating` is a pointer-transparent layer over the canvas whose interactive children
  (buttons, links, inputs, role=button) take clicks again, so a badge or toolbar floated
  there works; a ContextToolbar also sets pointer-events back on itself, and while hidden
  it is visibility: hidden, so it never swallows a canvas click. `prompt` sits under the canvas, `pages` above
  the status bar. All three render at either density.

  density 'pro' (default) is the layout above. 'quick' is the simple front door:
  no rail, a taller topbar, and `left` sized by its content with no resize handle
  (an AssetPanel owns its own width and collapse). The shell paints no background,
  so a host's frosted glass shows through; panels sit on --ripple-surface with
  --ripple-border hairlines. Not layout/Split (percent-based, imports the
  renderer). Tokens only, no colour literals.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import ResizeHandle from './ResizeHandle.svelte';
  import type { EditorPanelTab } from './types.js';

  interface Props {
    /** Left end of the top bar; never shrinks or gets overlapped. */
    title?: Snippet;
    topbar?: Snippet;
    rail?: Snippet;
    left?: Snippet;
    children?: Snippet;
    right?: Snippet<[string]>;
    status?: Snippet;
    /** Pointer-transparent layer over the canvas (its buttons, links and inputs still take clicks), for a floating ContextToolbar or badges. */
    floating?: Snippet;
    /** Row under the canvas, for a prompt bar. */
    prompt?: Snippet;
    /** Row above the status bar, for a PageStrip. */
    pages?: Snippet;
    /** 'pro' (default): rail + resizable panels. 'quick': no rail, content-sized left panel. */
    density?: 'quick' | 'pro';
    rightTabs?: EditorPanelTab[];
    /** Active right-panel tab id. Defaults to the first tab. */
    rightTab?: string;
    leftOpen?: boolean;
    rightOpen?: boolean;
    leftWidth?: number;
    rightWidth?: number;
    minPanel?: number;
    /** The right panel's minimum; inspectors need more room than a left list. */
    minRight?: number;
    maxPanel?: number;
    class?: string;
  }

  let {
    title,
    topbar,
    rail,
    left,
    children,
    right,
    status,
    floating,
    prompt,
    pages,
    density = 'pro',
    rightTabs = [],
    rightTab = $bindable(),
    leftOpen = $bindable(true),
    rightOpen = $bindable(true),
    leftWidth = $bindable(240),
    rightWidth = $bindable(280),
    minPanel = 180,
    minRight = 240,
    maxPanel = 520,
    class: className,
  }: Props = $props();

  const quick = $derived(density === 'quick');

  $effect.pre(() => {
    if (rightTabs.length && !rightTabs.some((t) => t.id === rightTab)) rightTab = rightTabs[0].id;
  });
</script>

{#snippet canvas()}
  <main
    data-slot="editor-center"
    class={cn('relative min-w-0 flex-1 overflow-hidden', prompt && 'min-h-0', !prompt && left && leftOpen && 'border-l border-ripple-border')}
  >
    {@render children?.()}
    {#if floating}
      <!-- See-through over the canvas, except what can be clicked: a hidden ContextToolbar stays unclickable (visibility: hidden). -->
      <div data-slot="editor-floating" class="pointer-events-none absolute inset-0 z-10 [&_:is(button,a[href],input,select,textarea,[role=button])]:pointer-events-auto">{@render floating()}</div>
    {/if}
  </main>
{/snippet}

<div
  data-slot="editor-shell"
  data-density={density}
  class={cn('flex size-full min-h-0 flex-col overflow-hidden text-ripple-surface-foreground', className)}
>
  {#if title || topbar}
    <div data-slot="editor-topbar" class="flex {quick ? 'min-h-12 px-3' : 'min-h-10 px-2'} shrink-0 items-center gap-2 border-b border-ripple-border bg-ripple-surface">
      {#if title}
        <div data-slot="editor-title" class="flex shrink-0 items-center">{@render title()}</div>
      {/if}
      {#if topbar}
        <div data-slot="editor-tools" class="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:thin] [&>*]:flex-1">{@render topbar()}</div>
      {/if}
    </div>
  {/if}

  <div class="flex min-h-0 flex-1">
    {#if rail && !quick}
      <div data-slot="editor-rail" class="flex shrink-0 flex-col border-r border-ripple-border bg-ripple-surface">
        {@render rail()}
      </div>
    {/if}

    {#if left && leftOpen && quick}
      <aside data-slot="editor-left" class="flex min-h-0 shrink-0 flex-col bg-ripple-surface">
        {@render left()}
      </aside>
    {:else if left && leftOpen}
      <aside data-slot="editor-left" class="flex min-h-0 shrink-0 flex-col overflow-auto bg-ripple-surface" style:width="{leftWidth}px">
        {@render left()}
      </aside>
      <ResizeHandle bind:value={leftWidth} min={minPanel} max={maxPanel} edge="left" label="Resize left panel" />
    {/if}

    {#if prompt}
      <div class={cn('flex min-w-0 flex-1 flex-col', left && leftOpen && 'border-l border-ripple-border')}>
        {@render canvas()}
        <div data-slot="editor-prompt" class="shrink-0 px-3 pt-2 pb-3">{@render prompt()}</div>
      </div>
    {:else}
      {@render canvas()}
    {/if}

    {#if right && rightOpen}
      <ResizeHandle bind:value={rightWidth} min={minRight} max={maxPanel} edge="right" label="Resize right panel" />
      <aside
        data-slot="editor-right"
        class="flex min-h-0 shrink-0 flex-col border-l border-ripple-border bg-ripple-surface"
        style:width="{rightWidth}px"
      >
        {#if rightTabs.length && rightTab}
          <Tabs.Root bind:value={rightTab} class="min-h-0 flex-1 gap-0">
            <div class="shrink-0 border-b border-ripple-border p-1.5">
              <Tabs.List class="h-7 w-full">
                {#each rightTabs as tab (tab.id)}
                  <Tabs.Trigger value={tab.id} class="text-[12px]">{tab.label}</Tabs.Trigger>
                {/each}
              </Tabs.List>
            </div>
            <Tabs.Content value={rightTab} class="min-h-0 flex-1 overflow-auto">
              {#key rightTab}{@render right(rightTab)}{/key}
            </Tabs.Content>
          </Tabs.Root>
        {:else}
          <div class="min-h-0 flex-1 overflow-auto">{@render right('')}</div>
        {/if}
      </aside>
    {/if}
  </div>

  {#if pages}
    <div data-slot="editor-pages" class="shrink-0 border-t border-ripple-border bg-ripple-surface">{@render pages()}</div>
  {/if}

  {#if status}
    <div
      data-slot="editor-status"
      class="flex h-6 shrink-0 items-center gap-3 border-t border-ripple-border bg-ripple-surface px-2 text-[11px] tabular-nums text-ripple-muted-foreground"
    >
      {@render status()}
    </div>
  {/if}
</div>
