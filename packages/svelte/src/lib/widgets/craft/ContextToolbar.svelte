<!--
  widgets/craft/ContextToolbar.svelte
  The selection-aware toolbar of a craft editor: the five to seven edits that
  matter for what is selected (font, size, colour, effects, "Ask Paw"), with a
  `>>` button that opens the full edit panel for it. On `./ui` only.

  - variant 'floating' (Quick mode): absolutely positioned in its parent, centred
    over `anchor` (the selection's rect in SCREEN space, the frame CanvasViewport's
    `overlay` and EditorShell's `floating` layer share). It flips below when there
    is no room above, clamps inside the parent (or `bounds`), and hides when the
    anchor leaves the view or is null. Maths in `toolbar-math.ts`.
  - variant 'docked' (Pro density): an in-flow bar on --ripple-surface; no anchor.
  - The host's controls are `children`. `panel` (InspectorSection content) opens
    in a portaled popover from `>>`, so it escapes the stage's clipping.
  - Only the bar itself takes pointer events. It carries `data-canvas-ui`, so a
    CanvasViewport never treats a press on it as a canvas gesture. Prefer mounting
    it in EditorShell's `floating` slot, outside the stage.
  - role="toolbar"; Left/Right/Home/End move focus between its buttons (inputs
    keep their arrows). Floating paints on --ripple-popover with a blur, fades in,
    and drops the fade under prefers-reduced-motion.
  Tokens only, no colour literals.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import ChevronsRightIcon from '@lucide/svelte/icons/chevrons-right';
  import { placeToolbar, type Size } from './toolbar-math.js';
  import type { ScreenRect } from './types.js';

  interface Props {
    variant?: 'floating' | 'docked';
    /** The selection's rect in screen space. Null or absent hides a floating bar. */
    anchor?: ScreenRect | null;
    /** The space to stay inside. Defaults to the parent element's size. */
    bounds?: Size;
    prefer?: 'top' | 'bottom';
    /** Space between the selection and the bar, px. */
    gap?: number;
    /** The host's controls. */
    children?: Snippet;
    /** The full edit panel behind `>>`. No panel, no `>>` button. */
    panel?: Snippet;
    panelTitle?: string;
    /** Bindable. */
    panelOpen?: boolean;
    moreLabel?: string;
    label?: string;
    class?: string;
  }

  let {
    variant = 'floating',
    anchor = null,
    bounds,
    prefer = 'top',
    gap = 8,
    children,
    panel,
    panelTitle = 'Edit',
    panelOpen = $bindable(false),
    moreLabel = 'More options',
    label = 'Selection tools',
    class: className,
  }: Props = $props();

  const floating = $derived(variant === 'floating');

  let root = $state<HTMLDivElement | null>(null);
  let width = $state(0);
  let height = $state(0);
  let parentSize = $state<Size>({ width: 0, height: 0 });

  $effect(() => {
    const parent = floating && !bounds ? root?.parentElement : null;
    if (!parent) return;
    const read = () => (parentSize = { width: parent.clientWidth, height: parent.clientHeight });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(parent);
    return () => ro.disconnect();
  });

  const place = $derived(
    floating && anchor ? placeToolbar(anchor, { width, height }, bounds ?? parentSize, { prefer, gap }) : null,
  );
  /* Unmeasured (first frame) counts as hidden, so the bar never flashes at 0,0. */
  const hidden = $derived(floating && (!place || place.hidden || width === 0));

  $effect(() => {
    if (hidden && panelOpen) panelOpen = false;
  });

  function onkeydown(e: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'BUTTON' || !root) return;
    const items = [...root.querySelectorAll<HTMLElement>('button:not([disabled])')];
    const i = items.indexOf(target);
    if (i < 0) return;
    e.preventDefault();
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }
</script>

<div
  bind:this={root}
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  role="toolbar"
  tabindex="-1"
  aria-label={label}
  aria-orientation="horizontal"
  aria-hidden={hidden || undefined}
  data-slot="context-toolbar"
  data-variant={variant}
  data-side={place?.side}
  data-canvas-ui=""
  inert={hidden || undefined}
  {onkeydown}
  class={cn(
    'flex items-center gap-1',
    floating
      ? 'pointer-events-auto absolute top-0 left-0 z-10 w-max max-w-[calc(100%-16px)] rounded-xl bg-ripple-popover p-1 text-ripple-popover-foreground shadow-md ring-1 ring-ripple-border backdrop-blur-md transition-opacity duration-150 ease-ripple-out motion-reduce:transition-none'
      : 'min-h-11 w-full border-b border-ripple-border bg-ripple-surface px-2 py-1 text-ripple-surface-foreground',
    className,
  )}
  style:transform={place ? `translate(${place.x}px, ${place.y}px)` : undefined}
  style:opacity={floating ? (hidden ? 0 : 1) : undefined}
  style:visibility={hidden ? 'hidden' : undefined}
>
  {@render children?.()}
  {#if panel}
    <Popover.Root bind:open={panelOpen}>
      <Popover.Trigger
        aria-label={moreLabel}
        title={moreLabel}
        class="ml-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ripple-muted-foreground transition-colors duration-150 ease-ripple-out hover:bg-ripple-muted hover:text-current focus-visible:outline-2 focus-visible:outline-ripple-ring aria-expanded:bg-ripple-muted aria-expanded:text-current motion-reduce:transition-none"
      >
        <ChevronsRightIcon size={18} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Content
        side={floating ? (place?.side ?? 'bottom') : 'bottom'}
        align="end"
        sideOffset={8}
        data-slot="context-toolbar-panel"
        aria-label={panelTitle}
        class="max-h-[min(70vh,34rem)] w-80 gap-0 overflow-y-auto p-0"
      >
        <div class="sticky top-0 z-10 border-b border-ripple-border bg-ripple-popover px-3 py-2 text-[13px] font-semibold">
          {panelTitle}
        </div>
        <div class="py-1">{@render panel()}</div>
      </Popover.Content>
    </Popover.Root>
  {/if}
</div>
