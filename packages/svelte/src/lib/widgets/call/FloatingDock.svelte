<!--
  FloatingDock.svelte — a draggable floating container (the minimised call).
  NEW 2026-09-30 (call UI new look, slice 0). Owns position only; the look of
  what is inside is the caller's. The dock itself paints the shared glass
  surface.

  Rules (lifted from paw-enterprise's CallDock):
  - drag from anywhere except a control: a pointerdown on a button, link,
    input, select, textarea or [role=button] is ignored; pointer capture keeps
    the drag alive outside the element; primary button only
  - on release it snaps to the nearer side (left/right) and clamps inside its
    bounds, `gap` px from every edge; `snap={false}` only clamps (drops in place)
  - re-clamps on window resize (<svelte:window onresize>, no $effect)
  - keyboard: a labelled region; its controls stay in the tab order. There is
    no keyboard move (the production dock has none either)
  bounds: 'window' (position: fixed, the production dock) or 'parent'
  (position: absolute inside the positioned parent, e.g. a lab frame).
  Until the first move it sits in `corner` (four corners, or top-center /
  bottom-center: horizontally centred), `gap` px from the edges.
  onPositionChange({x, y}) fires on drop, in bounds-relative px. Tokens only.
  UPDATED 2026-09-30: `snap` prop and the two centred corners; the corner
  offsets now follow `gap` (via --ripple-dock-gap) instead of a fixed 12px.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  type Pos = { x: number; y: number };

  let {
    label,
    corner = 'bottom-right',
    bounds = 'window',
    gap = 12,
    snap = true,
    onPositionChange,
    class: className,
    style,
    children,
    ...rest
  }: Omit<HTMLAttributes<HTMLDivElement>, 'style'> & {
    label: string;
    corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    bounds?: 'window' | 'parent';
    gap?: number;
    /** Snap to the nearer side on drop (default). false: stay where dropped, clamped. */
    snap?: boolean;
    onPositionChange?: (pos: Pos) => void;
    style?: string;
    children?: Snippet;
  } = $props();

  const NO_DRAG = 'button, a, input, select, textarea, [role="button"]';

  let el = $state<HTMLDivElement>();
  let pos = $state<Pos | null>(null);
  let grab: { dx: number; dy: number } | null = null;

  function box() {
    if (bounds === 'parent' && el?.parentElement) return el.parentElement.getBoundingClientRect();
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }
  function clamp(x: number, y: number): Pos {
    if (!el) return { x, y };
    const b = box();
    return {
      x: Math.max(gap, Math.min(x, b.width - el.offsetWidth - gap)),
      y: Math.max(gap, Math.min(y, b.height - el.offsetHeight - gap)),
    };
  }

  function down(e: PointerEvent) {
    if (!el || e.button !== 0 || (e.target as Element).closest(NO_DRAG)) return;
    const r = el.getBoundingClientRect();
    grab = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.setPointerCapture?.(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!grab) return;
    const b = box();
    pos = clamp(e.clientX - b.left - grab.dx, e.clientY - b.top - grab.dy);
  }
  function up() {
    if (!grab) return;
    grab = null;
    if (!pos || !el) return;
    if (snap) {
      const left = pos.x + el.offsetWidth / 2 < box().width / 2;
      pos = clamp(left ? gap : Infinity, pos.y);
    }
    onPositionChange?.(pos);
  }
</script>

<svelte:window onresize={() => pos && (pos = clamp(pos.x, pos.y))} />

<div
  bind:this={el}
  role="region"
  aria-label={label}
  data-slot="floating-dock"
  data-corner={corner}
  data-bounds={bounds}
  class={cn('ripple-dock', className)}
  style="--ripple-dock-gap:{gap}px;{pos ? `left:${pos.x}px;top:${pos.y}px;right:auto;bottom:auto;` : ''}{style ?? ''}"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  {...rest}
>
  {@render children?.()}
</div>

<style>
  .ripple-dock {
    position: fixed;
    z-index: 50;
    touch-action: none;
    user-select: none;
    cursor: grab;
    color: var(--ripple-surface-foreground);
    border: 1px solid var(--ripple-border);
    border-radius: 1rem;
    background: color-mix(in oklch, var(--ripple-surface) 80%, transparent);
    backdrop-filter: blur(28px) saturate(1.5);
    -webkit-backdrop-filter: blur(28px) saturate(1.5);
    box-shadow: 0 16px 40px color-mix(in oklch, var(--ripple-surface) 60%, transparent);
    transition:
      left 200ms var(--ripple-ease-out),
      top 200ms var(--ripple-ease-out);
  }
  .ripple-dock[data-bounds='parent'] {
    position: absolute;
  }
  .ripple-dock:active {
    cursor: grabbing;
    transition: none;
  }
  .ripple-dock[data-corner='top-left'] {
    top: var(--ripple-dock-gap);
    left: var(--ripple-dock-gap);
  }
  .ripple-dock[data-corner='top-right'] {
    top: var(--ripple-dock-gap);
    right: var(--ripple-dock-gap);
  }
  .ripple-dock[data-corner='bottom-left'] {
    bottom: var(--ripple-dock-gap);
    left: var(--ripple-dock-gap);
  }
  .ripple-dock[data-corner='bottom-right'] {
    bottom: var(--ripple-dock-gap);
    right: var(--ripple-dock-gap);
  }
  .ripple-dock[data-corner='top-center'],
  .ripple-dock[data-corner='bottom-center'] {
    left: 0;
    right: 0;
    width: max-content;
    margin-inline: auto;
  }
  .ripple-dock[data-corner='top-center'] {
    top: var(--ripple-dock-gap);
  }
  .ripple-dock[data-corner='bottom-center'] {
    bottom: var(--ripple-dock-gap);
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-dock {
      transition: none;
    }
  }
</style>
