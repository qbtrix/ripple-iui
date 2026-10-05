<!--
  widgets/craft/EditorShell.svelte
  The layout every craft editor shares (vector, photo, layout). On `./ui` only
  (no registry or manifest entry).

    ┌ title ┬─────────── topbar ─────────────┐
    │rail│ left │       children      │ right │
    │    │  ⇔   │    (CanvasViewport) │ ⇔ tabs│
    └──────────────── status ────────────────┘

  Every region is an optional snippet. `title` (the app name or a view switcher)
  never shrinks; `topbar` takes the rest of the row and scrolls sideways when its
  controls don't fit, so a narrow editor never draws controls over the title. The
  topbar's root grows to fill that region, so a host's flex-1 spacer pushes trailing
  controls (zoom) to the right edge. `left` and `right` are resizable px panels
  (`leftWidth`, `rightWidth`, bindable, with min/max) that can be hidden with
  `leftOpen` / `rightOpen`; the right panel has its own floor, `minRight` (240, an
  inspector's label column plus a two-up field pair; a left page list can go to
  `minPanel`, 180). When `rightTabs` is given the right panel is tabbed (bits-ui
  Tabs) and `right` is called with the active tab id, so only the visible tab is
  mounted. The centre is `position: relative` and clips, ready for a viewport.

  The shell paints no background of its own, so a host's frosted-glass page
  shows through; panels sit on --ripple-surface with --ripple-border hairlines.
  It does not use layout/Split: Split is percent-based, two-pane, and imports
  the spec renderer. Tokens only, no colour literals.
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

  $effect.pre(() => {
    if (rightTabs.length && !rightTabs.some((t) => t.id === rightTab)) rightTab = rightTabs[0].id;
  });
</script>

<div
  data-slot="editor-shell"
  class={cn('flex size-full min-h-0 flex-col overflow-hidden text-ripple-surface-foreground', className)}
>
  {#if title || topbar}
    <div data-slot="editor-topbar" class="flex min-h-10 shrink-0 items-center gap-2 border-b border-ripple-border bg-ripple-surface px-2">
      {#if title}
        <div data-slot="editor-title" class="flex shrink-0 items-center">{@render title()}</div>
      {/if}
      {#if topbar}
        <div data-slot="editor-tools" class="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:thin] [&>*]:flex-1">{@render topbar()}</div>
      {/if}
    </div>
  {/if}

  <div class="flex min-h-0 flex-1">
    {#if rail}
      <div data-slot="editor-rail" class="flex shrink-0 flex-col border-r border-ripple-border bg-ripple-surface">
        {@render rail()}
      </div>
    {/if}

    {#if left && leftOpen}
      <aside data-slot="editor-left" class="flex min-h-0 shrink-0 flex-col overflow-auto bg-ripple-surface" style:width="{leftWidth}px">
        {@render left()}
      </aside>
      <ResizeHandle bind:value={leftWidth} min={minPanel} max={maxPanel} edge="left" label="Resize left panel" />
    {/if}

    <main data-slot="editor-center" class={cn('relative min-w-0 flex-1 overflow-hidden', left && leftOpen && 'border-l border-ripple-border')}>
      {@render children?.()}
    </main>

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

  {#if status}
    <div
      data-slot="editor-status"
      class="flex h-6 shrink-0 items-center gap-3 border-t border-ripple-border bg-ripple-surface px-2 text-[11px] tabular-nums text-ripple-muted-foreground"
    >
      {@render status()}
    </div>
  {/if}
</div>
