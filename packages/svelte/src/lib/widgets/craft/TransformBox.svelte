<!--
  widgets/craft/TransformBox.svelte
  The selection box of a craft editor: a bounding box with 8 resize handles
  over one selected object. Render it in CanvasViewport's `overlay` snippet:
  `rect` is in DOCUMENT units and `zoom` / `panX` / `panY` are the viewport
  transform the snippet hands over, so the box and its 8 px handles are drawn
  in screen px and stay the same size at any zoom.

  - Drag the box to move, a handle to resize (maths in transform-math.ts).
    `aspect` locks the ratio; Shift flips the lock for that drag. `bounds`
    keeps a move inside the page. `resize="none"` keeps only the move,
    `movable={false}` only the handles, `locked` neither (dashed, no handles).
  - Keys on the focused box: arrows move by `step` (Shift: `bigStep`),
    Alt + arrows resize from the far corner, Delete / Backspace call
    `ondelete`, Esc cancels a drag in progress. Handled keys never bubble, so
    an editor's arrow shortcuts (page turns) do not fire under a selection.
  - `onpreview` follows every step of a drag or nudge; `oncommit(rect, kind)`
    fires once: on pointer up (if it moved) or 400 ms after a burst of keys.
    The committed rect stays on screen until the host's `rect` catches up.
  - Pointer listeners are native and stop propagation: CanvasViewport listens
    natively on its stage, so a delegated handler here would run after it.
  The box is a tab stop (role="group", aria-roledescription "selection");
  the handles are pointer-only, Alt + arrows is their keyboard path.
  Tokens only, no colour literals.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { CanvasRect, TransformHandle, TransformKind } from './types.js';
  import { keyRect, moveRect, resizeRect } from './transform-math.js';

  interface Props {
    rect: CanvasRect;
    zoom: number;
    panX: number;
    panY: number;
    /** Lock the width:height ratio while resizing (Shift flips it). */
    aspect?: boolean;
    resize?: 'all' | 'none';
    movable?: boolean;
    locked?: boolean;
    /** Smallest width / height in document units. */
    minSize?: number;
    /** Keep a move inside this rect (document units), e.g. the page. */
    bounds?: CanvasRect | null;
    step?: number;
    bigStep?: number;
    /** What is selected, for its accessible name ("Signature"). */
    label?: string;
    /** Take focus when shown, so the arrow keys reach it. */
    autofocus?: boolean;
    onpreview?: (rect: CanvasRect) => void;
    oncommit?: (rect: CanvasRect, kind: TransformKind) => void;
    ondelete?: () => void;
    class?: string;
  }

  let {
    rect,
    zoom,
    panX,
    panY,
    aspect = false,
    resize = 'all',
    movable = true,
    locked = false,
    minSize = 4,
    bounds = null,
    step = 1,
    bigStep = 10,
    label = 'Selection',
    autofocus = false,
    onpreview,
    oncommit,
    ondelete,
    class: className,
  }: Props = $props();

  const HANDLES: TransformHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const CURSOR: Record<TransformHandle, string> = { nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
  const NUDGE_MS = 400;
  const HOLD_MS = 1500;

  /** The rect being dragged or nudged (null when idle). */
  let draft = $state<CanvasRect | null>(null);
  /** A committed rect shown until the host's `rect` moves off `from` (or HOLD_MS passes). */
  let held = $state<{ from: CanvasRect; r: CanvasRect } | null>(null);
  let drag: { kind: 'move' | 'resize'; h?: TransformHandle; sx: number; sy: number; start: CanvasRect } | null = null;
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
  /** Where a burst of arrow keys started (the commit compares against it). */
  let nudgeOrigin: CanvasRect | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  const same = (a: CanvasRect, b: CanvasRect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  const shown = $derived(draft ?? (held && same(held.from, rect) ? held.r : rect));
  const box = $derived({ left: panX + shown.x * zoom, top: panY + shown.y * zoom, width: shown.width * zoom, height: shown.height * zoom });
  const handles = $derived(locked || resize === 'none' ? [] : HANDLES);

  function commit(r: CanvasRect, kind: TransformKind, from: CanvasRect) {
    if (same(r, from)) return;
    held = { from: rect, r };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => (held = null), HOLD_MS);
    oncommit?.(r, kind);
  }

  /** Start a pointer drag on `node` (the box or a handle); moves and the release come back to it (pointer capture). */
  function begin(e: PointerEvent, node: HTMLElement, kind: 'move' | 'resize', h?: TransformHandle) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    root?.focus({ preventScroll: true });
    if (locked || (kind === 'move' && !movable)) return;
    node.setPointerCapture?.(e.pointerId);
    const start = shown;
    drag = { kind, h, sx: e.clientX, sy: e.clientY, start };
    const move = (ev: PointerEvent) => {
      ev.stopPropagation();
      if (!drag) return;
      const dx = (ev.clientX - drag.sx) / zoom;
      const dy = (ev.clientY - drag.sy) / zoom;
      draft = drag.kind === 'move' ? moveRect(drag.start, dx, dy, bounds) : resizeRect(drag.start, drag.h!, dx, dy, { aspect: aspect !== ev.shiftKey, min: minSize });
      onpreview?.(draft);
    };
    const end = (ev: PointerEvent) => {
      ev.stopPropagation();
      node.releasePointerCapture?.(ev.pointerId);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', end);
      const d = draft;
      const k = drag?.kind;
      drag = null;
      draft = null;
      if (d && k && ev.type === 'pointerup') commit(d, k, start);
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape' && drag) {
      drag = null;
      draft = null;
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && ondelete && !locked) {
      ondelete();
    } else {
      if (drag || locked || (e.altKey ? resize === 'none' : !movable)) return;
      const base = draft ?? shown;
      const next = keyRect(base, e.key, { shift: e.shiftKey, alt: e.altKey, aspect, step, bigStep, min: minSize, bounds });
      if (!next) return;
      nudgeOrigin ??= base;
      draft = next;
      onpreview?.(next);
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => {
        const [d, from] = [draft, nudgeOrigin];
        draft = null;
        nudgeOrigin = null;
        if (d && from) commit(d, 'nudge', from);
      }, NUDGE_MS);
    }
    e.preventDefault();
    e.stopPropagation();
  }

  let root = $state<HTMLDivElement | null>(null);

  /** Native listeners on the box (not delegated: see the header), and focus on mount when asked. */
  function boxInput(node: HTMLDivElement) {
    const down = (e: PointerEvent) => begin(e, node, 'move');
    node.addEventListener('pointerdown', down);
    node.addEventListener('keydown', onkey);
    if (autofocus) node.focus({ preventScroll: true });
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('keydown', onkey);
      clearTimeout(nudgeTimer);
      clearTimeout(holdTimer);
    };
  }
  const handleInput = (h: TransformHandle) => (node: HTMLDivElement) => {
    const down = (e: PointerEvent) => begin(e, node, 'resize', h);
    node.addEventListener('pointerdown', down);
    return () => node.removeEventListener('pointerdown', down);
  };

  // Spread, not attributes: svelte's a11y lint flags tabindex on role="group", yet a focusable box is the keyboard path.
  const TAB_STOP = { tabindex: 0 };
  const size = $derived(`${Math.round(shown.width)} by ${Math.round(shown.height)}`);
</script>

<div
  bind:this={root}
  {@attach boxInput}
  data-slot="transform-box"
  data-locked={locked ? 'true' : undefined}
  role="group"
  aria-roledescription="selection"
  aria-label="{label}, {size}{locked ? ', locked' : ''}"
  title={locked ? `${label} (locked)` : 'Drag to move. Arrow keys nudge (Shift: 10), Alt + arrows resize, Delete removes.'}
  {...TAB_STOP}
  class={cn('craft-transform', locked && 'locked', !locked && movable && 'movable', className)}
  style:left="{box.left}px"
  style:top="{box.top}px"
  style:width="{box.width}px"
  style:height="{box.height}px"
>
  {#each handles as h (h)}
    <div
      {@attach handleInput(h)}
      data-slot="transform-handle"
      data-handle={h}
      aria-hidden="true"
      class="craft-handle"
      style:left="{h.includes('w') ? 0 : h.includes('e') ? 100 : 50}%"
      style:top="{h.includes('n') ? 0 : h.includes('s') ? 100 : 50}%"
      style:cursor="{CURSOR[h]}-resize"
    ></div>
  {/each}
</div>

<style>
  .craft-transform {
    position: absolute;
    pointer-events: auto;
    box-shadow: 0 0 0 1px var(--ripple-accent);
    outline: none;
    touch-action: none;
  }
  .craft-transform.movable {
    cursor: move;
  }
  .craft-transform:focus-visible {
    box-shadow:
      0 0 0 1px var(--ripple-accent),
      0 0 0 3px color-mix(in oklab, var(--ripple-accent) 35%, transparent);
  }
  .craft-transform.locked {
    box-shadow: none;
    outline: 1px dashed var(--ripple-muted-foreground);
    cursor: default;
  }
  .craft-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 2px;
    background: var(--ripple-surface);
    box-shadow: 0 0 0 1px var(--ripple-accent);
    touch-action: none;
  }
</style>
