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
    bounds, `gap` px from every edge
  - re-clamps on window resize (<svelte:window onresize>, no $effect)
  - keyboard: the region is focusable; arrow keys move it 16px (clamped) while
    the region itself has focus
  bounds: 'window' (position: fixed, the production dock) or 'parent'
  (position: absolute inside the positioned parent, e.g. a lab frame).
  Until the first move it sits in `corner`. onPositionChange({x, y}) fires on
  drop and on each keyboard move, in bounds-relative px. Tokens only.
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
    onPositionChange,
    class: className,
    style,
    children,
    ...rest
  }: Omit<HTMLAttributes<HTMLDivElement>, 'style'> & {
    label: string;
    corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    bounds?: 'window' | 'parent';
    gap?: number;
    onPositionChange?: (pos: Pos) => void;
    style?: string;
    children?: Snippet;
  } = $props();

  const STEP = 16;
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
  function current(): Pos {
    if (pos) return pos;
    const b = box();
    const r = el!.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top };
  }
  function commit(next: Pos) {
    pos = next;
    onPositionChange?.(next);
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
    const left = pos.x + el.offsetWidth / 2 < box().width / 2;
    commit(clamp(left ? gap : Infinity, pos.y));
  }
  function key(e: KeyboardEvent) {
    if (e.target !== el) return;
    const d = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key];
    if (!d) return;
    e.preventDefault();
    const p = current();
    commit(clamp(p.x + d[0], p.y + d[1]));
  }
</script>

<svelte:window onresize={() => pos && (pos = clamp(pos.x, pos.y))} />

<div
  bind:this={el}
  role="region"
  aria-label={label}
  tabindex="0"
  data-slot="floating-dock"
  data-corner={corner}
  data-bounds={bounds}
  class={cn('ripple-dock', className)}
  style="{pos ? `left:${pos.x}px;top:${pos.y}px;right:auto;bottom:auto;` : ''}{style ?? ''}"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
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
    outline: none;
  }
  .ripple-dock[data-bounds='parent'] {
    position: absolute;
  }
  .ripple-dock:active {
    cursor: grabbing;
    transition: none;
  }
  .ripple-dock:focus-visible {
    box-shadow: 0 0 0 2px var(--ripple-ring);
  }
  .ripple-dock[data-corner='top-left'] {
    top: 12px;
    left: 12px;
  }
  .ripple-dock[data-corner='top-right'] {
    top: 12px;
    right: 12px;
  }
  .ripple-dock[data-corner='bottom-left'] {
    bottom: 12px;
    left: 12px;
  }
  .ripple-dock[data-corner='bottom-right'] {
    bottom: 12px;
    right: 12px;
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-dock {
      transition: none;
    }
  }
</style>
