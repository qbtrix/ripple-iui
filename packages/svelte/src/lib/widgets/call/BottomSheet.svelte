<!--
  BottomSheet.svelte — a NON-modal bottom sheet with three stops: peek, half,
  full. NEW 2026-09-30 (call UI new look, slice 0). Lifted from
  paw-enterprise's CallChatSheet (the phone in-call chat).

  Not the `Sheet` overlay: no dialog role, no focus trap, no backdrop. It is an
  overlay positioned absolute at the bottom of its positioned parent, so what
  sits under it never remounts. Content stays mounted across stops.
  Handle: drag it more than 48px to move one stop (up: peek→half→full, down:
  full→half→peek); a press under 6px is a tap and toggles (peek→half,
  half→full, full→half). Keyboard on the handle: Enter/Space toggle,
  ArrowUp/ArrowDown step. `stop` is bindable and reflected as data-state;
  onStopChange fires on every change the sheet makes. handleLabel(stop) names
  the handle (default "Expand" / "Shrink"); handleTestId tags it.
  Heights: peek 3.5rem, half 50%, full 100%, overridable via --ripple-sheet-peek
  / --ripple-sheet-half. Tokens only.
-->
<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  type Stop = 'peek' | 'half' | 'full';

  let {
    stop = $bindable('peek'),
    label,
    onStopChange,
    handleLabel = (s: Stop) => (s === 'full' ? 'Shrink' : 'Expand'),
    handleTestId,
    class: className,
    style,
    children,
    ...rest
  }: Omit<HTMLAttributes<HTMLDivElement>, 'style'> & {
    stop?: Stop;
    label?: string;
    onStopChange?: (stop: Stop) => void;
    handleLabel?: (stop: Stop) => string;
    handleTestId?: string;
    style?: string;
    children?: Snippet;
  } = $props();

  const ORDER: Stop[] = ['peek', 'half', 'full'];
  const DRAG = 48;
  const TAP = 6;

  let dragging = $state(false);
  let dy = $state(0);
  let startY = 0;

  function go(next: Stop) {
    if (next === stop) return;
    stop = next;
    onStopChange?.(next);
  }
  const step = (dir: 1 | -1) => go(ORDER[Math.max(0, Math.min(2, ORDER.indexOf(stop) + dir))]);
  const toggle = () => go(stop === 'half' ? 'full' : 'half');

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    dy = 0;
    startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (dragging) dy = e.clientY - startY;
  }
  function up() {
    if (!dragging) return;
    const d = dy;
    dragging = false;
    dy = 0;
    if (d < -DRAG) step(1);
    else if (d > DRAG) step(-1);
    else if (Math.abs(d) < TAP) toggle();
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      step(-1);
    }
  }
</script>

<div
  role="region"
  aria-label={label}
  data-slot="bottom-sheet"
  data-state={stop}
  data-dragging={dragging ? '' : undefined}
  class={cn('ripple-sheet', className)}
  style={safeStyle(`${dragging && dy ? `transform:translateY(${dy}px);` : ''}${style ?? ''}`)}
  {...rest}
>
  <div
    role="button"
    tabindex="0"
    aria-label={handleLabel(stop)}
    data-slot="bottom-sheet-handle"
    data-testid={handleTestId}
    class="ripple-sheet-handle"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}
  >
    <span class="ripple-sheet-grip" aria-hidden="true"></span>
  </div>
  <div class="ripple-sheet-body">{@render children?.()}</div>
</div>

<style>
  .ripple-sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    height: var(--ripple-sheet-peek, 3.5rem);
    overflow: hidden;
    border-top-left-radius: 1.25rem;
    border-top-right-radius: 1.25rem;
    border: 1px solid var(--ripple-border);
    border-bottom: 0;
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-surface) 88%, transparent);
    backdrop-filter: blur(28px) saturate(1.5);
    -webkit-backdrop-filter: blur(28px) saturate(1.5);
    transition:
      height 260ms var(--ripple-ease-out),
      transform 260ms var(--ripple-ease-out);
  }
  .ripple-sheet[data-state='half'] {
    height: var(--ripple-sheet-half, 50%);
  }
  .ripple-sheet[data-state='full'] {
    height: 100%;
    border-radius: 0;
  }
  .ripple-sheet[data-dragging] {
    transition: none;
  }
  .ripple-sheet-handle {
    display: grid;
    place-items: center;
    flex: none;
    height: 1.25rem;
    cursor: grab;
    touch-action: none;
    outline: none;
  }
  .ripple-sheet-handle:focus-visible .ripple-sheet-grip {
    box-shadow: 0 0 0 2px var(--ripple-ring);
  }
  .ripple-sheet-grip {
    width: 2.25rem;
    height: 0.25rem;
    border-radius: 999px;
    background: color-mix(in oklch, var(--ripple-surface-foreground) 35%, transparent);
  }
  .ripple-sheet-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-sheet {
      transition: none;
    }
  }
</style>
