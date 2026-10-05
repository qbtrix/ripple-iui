<!--
  widgets/craft/ToolRail.svelte
  The tool picker of a craft editor (vector, photo, layout): a vertical or
  horizontal strip of icon buttons with exactly one active tool. On `./ui`
  only (no registry or manifest entry).

  - role="toolbar" with roving tabindex: the active tool is the tab stop, the
    arrow keys move focus (both axes work), Home/End jump, Enter/Space select.
  - Each button carries aria-pressed and aria-keyshortcuts, and a tooltip with
    the label and the hotkey.
  - `hotkeys` (opt-in) listens on window for an unmodified single key matching
    a tool's `hotkey`. It ignores keys aimed at text fields, keys while a
    dialog, menu, listbox or popover is open, and keys while the rail sits in
    an inert subtree (`hotkeysBlocked` in types.ts).
  - Icons come from the `icon` snippet (the host maps `tool.icon` to a glyph);
    without one the button shows the label's first letter.
  - Consecutive tools sharing `group` render as one role="group", with a
    hairline separator between groups.
  Tokens only, no colour literals.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { type CraftTool, hotkeysBlocked, isEditableTarget } from './types.js';

  interface Props {
    tools: CraftTool[];
    /** Active tool id. Bindable; `onselect` fires either way. */
    active?: string;
    onselect?: (id: string) => void;
    orientation?: 'vertical' | 'horizontal';
    /** Listen on window for single-key tool hotkeys. Off by default. */
    hotkeys?: boolean;
    /** Show each group's name as a small caption. */
    showGroupLabels?: boolean;
    icon?: Snippet<[CraftTool]>;
    label?: string;
    class?: string;
  }

  let {
    tools,
    active = $bindable(),
    onselect,
    orientation = 'vertical',
    hotkeys = false,
    showGroupLabels = false,
    icon,
    label = 'Tools',
    class: className,
  }: Props = $props();

  let root = $state<HTMLDivElement | null>(null);

  const groups = $derived.by(() => {
    const out: { name?: string; tools: CraftTool[] }[] = [];
    for (const t of tools) {
      const last = out.at(-1);
      if (last && last.name === t.group) last.tools.push(t);
      else out.push({ name: t.group, tools: [t] });
    }
    return out;
  });

  const enabled = $derived(tools.filter((t) => !t.disabled));
  // The tab stop: the active tool, or the first enabled one.
  const stop = $derived(enabled.some((t) => t.id === active) ? active : enabled[0]?.id);

  function select(id: string) {
    active = id;
    onselect?.(id);
  }

  function onkeydown(e: KeyboardEvent) {
    const prev = ['ArrowUp', 'ArrowLeft'].includes(e.key);
    const next = ['ArrowDown', 'ArrowRight'].includes(e.key);
    if (!prev && !next && e.key !== 'Home' && e.key !== 'End') return;
    const buttons = [...(root?.querySelectorAll<HTMLButtonElement>('button[data-tool]:not(:disabled)') ?? [])];
    if (!buttons.length) return;
    e.preventDefault();
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const n = buttons.length;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (next ? 1 : -1) + n) % n;
    buttons[to].focus();
  }

  $effect(() => {
    if (!hotkeys) return;
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target) || hotkeysBlocked(root)) return;
      const hit = enabled.find((t) => t.hotkey && t.hotkey.toLowerCase() === e.key.toLowerCase());
      if (!hit) return;
      e.preventDefault();
      select(hit.id);
    };
    window.addEventListener('keydown', onWindowKey);
    return () => window.removeEventListener('keydown', onWindowKey);
  });
</script>

<div
  bind:this={root}
  role="toolbar"
  aria-label={label}
  aria-orientation={orientation}
  tabindex="-1"
  {onkeydown}
  data-slot="tool-rail"
  class={cn(
    'flex gap-1 p-1',
    orientation === 'vertical' ? 'flex-col items-center' : 'flex-row items-center',
    className
  )}
>
  {#each groups as g, gi (gi)}
    {#if gi > 0}
      <div
        aria-hidden="true"
        class={cn('shrink-0 bg-ripple-border', orientation === 'vertical' ? 'my-0.5 h-px w-5' : 'mx-0.5 h-5 w-px')}
      ></div>
    {/if}
    <div
      role="group"
      aria-label={g.name}
      class={cn('flex gap-0.5', orientation === 'vertical' ? 'flex-col items-center' : 'flex-row items-center')}
    >
      {#if showGroupLabels && g.name}
        <span class="px-1 text-[10px] font-medium uppercase tracking-wide text-ripple-muted-foreground">{g.name}</span>
      {/if}
      {#each g.tools as tool (tool.id)}
        {@const on = tool.id === active}
        <Tooltip.Root delayDuration={400}>
          <Tooltip.Trigger
            data-tool={tool.id}
            aria-label={tool.label}
            aria-pressed={on ? 'true' : 'false'}
            aria-keyshortcuts={tool.hotkey}
            disabled={tool.disabled}
            tabindex={tool.id === stop ? 0 : -1}
            onclick={() => select(tool.id)}
            class={cn(
              'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[13px] outline-none',
              'text-ripple-muted-foreground transition-colors duration-150 ease-ripple-out',
              'hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground',
              'focus-visible:ring-2 focus-visible:ring-ripple-ring/60',
              'disabled:pointer-events-none disabled:opacity-40',
              on && 'bg-ripple-accent/15 text-ripple-accent hover:bg-ripple-accent/20 hover:text-ripple-accent'
            )}
          >
            {#if icon}{@render icon(tool)}{:else}<span aria-hidden="true">{tool.label.charAt(0)}</span>{/if}
          </Tooltip.Trigger>
          <Tooltip.Content side={orientation === 'vertical' ? 'right' : 'bottom'} sideOffset={6}>
            {tool.label}
            {#if tool.hotkey}
              <kbd data-slot="kbd" class="rounded-sm px-1 font-mono text-[10px] uppercase opacity-70">{tool.hotkey}</kbd>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </div>
  {/each}
</div>
