<!--
  widgets/craft/CanvasViewport.svelte
  The pan/zoom stage of a craft editor. Hosts a document of docWidth x
  docHeight (a <canvas> or any content) and reports pointer input in DOCUMENT
  coordinates. On `./ui` only (no registry or manifest entry).

  - Transform: document point d sits at screen point pan + d * zoom (maths in
    viewport-math.ts). `zoom`, `panX`, `panY` are bindable.
  - Panning only rewrites one CSS transform on the artboard frame; the child is
    never re-rendered by a pan. Zoom resizes the frame and scales the content
    layer. For crisp output a host canvas reads `zoom` and sizes its backing
    store to docWidth * zoom * devicePixelRatio. A host that renders the view
    itself can use the `overlay` snippet, a screen-space layer that receives
    the transform and viewport size.
  - Input: ctrl/meta + wheel (and trackpad pinch, which arrives as ctrl+wheel)
    zooms at the cursor; a plain wheel pans, or zooms when wheel="zoom".
    Space + drag, a middle-button drag, or `pan` (hand tool) pans. Space is
    only claimed while the stage is hovered or focused, and never from a text
    field or while an overlay is open. Everything else is sent to `onpointer`
    as down/drag/up/move/doubleclick with modifiers.
  - Methods via bind:this: fit(), zoomIn(), zoomOut(), zoomTo(z), actualSize(),
    screenToDoc(clientX, clientY).
  - Rulers (`rulers`): top and left strips that follow zoom and pan, labelled
    in `rulerUnit` with `unitSize` document units per ruler unit (72 for in on
    a points document), counting from `rulerOrigin`. They mark the cursor and
    the `selection` extent, fill from the theme surface (light or dark with
    the host), and fit leaves room for them.
  - Guides (`guides`, document coords): drag out of a ruler to add one, drag a
    guide to move it, drop it back on its ruler to remove it. Each edit is an
    `onguide` event; the host owns the list. `guidesEditable={false}` makes
    them display-only (e.g. while a drawing tool is active).
  - The stage is a tab stop (tabindex=0, role="application" named by `label`)
    with an inset focus-visible ring; a click also focuses it, blurring
    inspector fields. It consumes no keys but Space, so arrows and editor
    shortcuts bubble to the host, which owns them.
    A press on an element marked `data-canvas-ui` (a ContextToolbar) is never
    a gesture.
  Tokens only, no colour literals.
-->
<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { type CanvasGuide, type CanvasGuideChange, type CanvasPointer, type CanvasRect, type ViewTransform, hotkeysBlocked, isEditableTarget } from './types.js';
  import { rulerTicks } from './ruler-math.js';
  import * as vm from './viewport-math.js';

  interface Props {
    docWidth: number;
    docHeight: number;
    zoom?: number;
    panX?: number;
    panY?: number;
    minZoom?: number;
    maxZoom?: number;
    /** What a plain (unmodified) wheel does. */
    wheel?: 'pan' | 'zoom';
    /** Hand tool: a left drag pans instead of reaching `onpointer`. */
    pan?: boolean;
    /** Fit the document once the stage has a size. */
    fitOnMount?: boolean;
    fitPadding?: number;
    checkerboard?: boolean;
    /** Drop shadow and hairline around the document. */
    artboard?: boolean;
    /** CSS cursor while not panning (the active tool's cursor). */
    cursor?: string;
    onpointer?: (e: CanvasPointer) => void;
    children?: Snippet;
    overlay?: Snippet<[ViewTransform & { width: number; height: number }]>;
    label?: string;
    class?: string;
    rulers?: boolean;
    /** Unit label shown in the ruler corner (pt, in, mm, px). */
    rulerUnit?: string;
    /** Document units per ruler unit (72 = inches on a points document). */
    unitSize?: number;
    /** Document point the rulers count from (default 0,0), e.g. the trim corner inside a bleed. */
    rulerOrigin?: { x: number; y: number };
    /** Selection extent in document coordinates, highlighted on the rulers. */
    selection?: CanvasRect | null;
    guides?: CanvasGuide[];
    guidesEditable?: boolean;
    onguide?: (e: CanvasGuideChange) => void;
  }

  let {
    docWidth,
    docHeight,
    zoom = $bindable(1),
    panX = $bindable(0),
    panY = $bindable(0),
    minZoom = 0.02,
    maxZoom = 64,
    wheel = 'pan',
    pan = false,
    fitOnMount = true,
    fitPadding = 32,
    checkerboard = false,
    artboard = true,
    cursor,
    onpointer,
    children,
    overlay,
    label = 'Canvas',
    class: className,
    rulers = false,
    rulerUnit = 'pt',
    unitSize = 1,
    rulerOrigin = { x: 0, y: 0 },
    selection = null,
    guides = [],
    guidesEditable = true,
    onguide,
  }: Props = $props();

  /** Ruler thickness in CSS px. */
  const R = 20;

  let root = $state<HTMLDivElement | null>(null);
  let vw = $state(0);
  let vh = $state(0);
  let hovered = $state(false);
  let spaceDown = $state(false);
  let panning: { x: number; y: number; px: number; py: number } | null = $state(null);
  let pressed = false;
  let fitted = false;

  const t = (): ViewTransform => ({ zoom, panX, panY });
  function apply(next: ViewTransform) {
    zoom = next.zoom;
    panX = next.panX;
    panY = next.panY;
  }
  function local(clientX: number, clientY: number) {
    const r = root?.getBoundingClientRect();
    return { sx: clientX - (r?.left ?? 0), sy: clientY - (r?.top ?? 0) };
  }

  export function screenToDoc(clientX: number, clientY: number) {
    const { sx, sy } = local(clientX, clientY);
    return vm.screenToDoc(sx, sy, t());
  }
  export function fit() {
    if (!root) return;
    const r = rulers ? R : 0;
    const f = vm.fitTransform(root.clientWidth - r, root.clientHeight - r, docWidth, docHeight, fitPadding, minZoom, maxZoom);
    apply({ zoom: f.zoom, panX: f.panX + r, panY: f.panY + r });
  }
  /** Zoom about the stage centre. */
  export function zoomTo(z: number) {
    apply(vm.zoomAt(t(), z, (root?.clientWidth ?? 0) / 2, (root?.clientHeight ?? 0) / 2, minZoom, maxZoom));
  }
  export const zoomIn = () => zoomTo(zoom * 2);
  export const zoomOut = () => zoomTo(zoom / 2);
  export const actualSize = () => zoomTo(1);

  $effect(() => {
    if (fitOnMount && !fitted && vw > 0 && vh > 0) {
      fitted = true;
      untrack(fit);
    }
  });

  function emit(kind: CanvasPointer['kind'], e: PointerEvent | MouseEvent) {
    if (!onpointer) return;
    const { x, y } = screenToDoc(e.clientX, e.clientY);
    const pe = e as PointerEvent;
    onpointer({
      kind,
      x,
      y,
      mods: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
      button: e.button,
      pointerType: pe.pointerType || 'mouse',
      pressure: pe.pressure ?? 0.5,
    });
  }

  /** A press on UI laid over the canvas (a ContextToolbar marks itself `data-canvas-ui`). */
  const onCanvasUi = (e: Event) => !!(e.target as Element | null)?.closest?.('[data-canvas-ui]');

  function onpointerdown(e: PointerEvent) {
    if (onCanvasUi(e)) return;
    root?.focus({ preventScroll: true });
    const wantsPan = e.button === 1 || (e.button === 0 && (spaceDown || pan));
    if (!wantsPan && e.button !== 0) return;
    e.preventDefault();
    root?.setPointerCapture?.(e.pointerId);
    if (wantsPan) {
      panning = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      return;
    }
    pressed = true;
    emit('down', e);
  }
  function onpointermove(e: PointerEvent) {
    if (rulers) cursorAt = local(e.clientX, e.clientY);
    if (panning) {
      panX = panning.px + (e.clientX - panning.x);
      panY = panning.py + (e.clientY - panning.y);
      return;
    }
    emit(pressed ? 'drag' : 'move', e);
  }
  function onpointerup(e: PointerEvent) {
    root?.releasePointerCapture?.(e.pointerId);
    if (panning) {
      panning = null;
      return;
    }
    if (!pressed) return;
    pressed = false;
    emit('up', e);
  }

  // Listeners are attached here rather than as attributes: wheel must be
  // non-passive (Svelte's `onwheel` is passive) to stop the page scrolling or
  // zooming, and role="application" counts as non-interactive to svelte's a11y
  // lint even though it is the right role for a free-form canvas.
  $effect(() => {
    const el = root;
    if (!el) return;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, fn);
      return () => el.removeEventListener(type, fn);
    };
    const offs = [
      on('pointerdown', onpointerdown),
      on('pointermove', onpointermove),
      on('pointerup', onpointerup),
      on('pointercancel', onpointerup),
      on('pointerenter', () => (hovered = true)),
      on('pointerleave', () => {
        hovered = false;
        cursorAt = null;
      }),
      on('dblclick', (e) => e.button === 0 && !onCanvasUi(e) && !spaceDown && !pan && emit('doubleclick', e)),
      on('mousedown', (e) => e.button === 1 && e.preventDefault()),
    ];
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey || wheel === 'zoom') {
        const { sx, sy } = local(e.clientX, e.clientY);
        const k = e.ctrlKey ? 0.01 : 0.002; // pinch deltas are small, wheel notches ~100
        apply(vm.zoomAt(t(), zoom * 2 ** (-vm.clamp(dy, -100, 100) * k), sx, sy, minZoom, maxZoom));
      } else if (e.shiftKey && dx === 0) {
        panX -= dy;
      } else {
        panX -= dx;
        panY -= dy;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      offs.forEach((off) => off());
    };
  });

  $effect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditableTarget(e.target) || hotkeysBlocked(root)) return;
      if (!hovered && !root?.contains(document.activeElement)) return;
      e.preventDefault();
      spaceDown = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown = false;
    };
    const blur = () => (spaceDown = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  });

  // ---- rulers and guides ----------------------------------------------------
  let cursorAt = $state<{ sx: number; sy: number } | null>(null);
  /** The guide being dragged (from a ruler when index is undefined). */
  let draft = $state<(CanvasGuide & { index?: number; offRuler: boolean }) | null>(null);
  const ppu = $derived(zoom * unitSize);
  const ticksX = $derived(rulers ? rulerTicks(vw, panX + rulerOrigin.x * zoom, ppu) : null);
  const ticksY = $derived(rulers ? rulerTicks(vh, panY + rulerOrigin.y * zoom, ppu) : null);
  const selX = $derived(selection ? [panX + selection.x * zoom, panX + (selection.x + selection.width) * zoom] : null);
  const selY = $derived(selection ? [panY + selection.y * zoom, panY + (selection.y + selection.height) * zoom] : null);
  const guideScreen = (g: CanvasGuide) => (g.orientation === 'horizontal' ? panY + g.position * zoom : panX + g.position * zoom);

  /** Native listeners (not delegated), so stopPropagation keeps guide drags away from the stage handlers. */
  function guideDrag(start: (e: PointerEvent) => (CanvasGuide & { index?: number }) | null) {
    return (node: HTMLElement) => {
      const move = (e: PointerEvent) => {
        e.stopPropagation();
        if (!draft) return;
        const { sx, sy } = local(e.clientX, e.clientY);
        const d = vm.screenToDoc(sx, sy, t());
        const horizontal = draft.orientation === 'horizontal';
        draft = { ...draft, position: horizontal ? d.y : d.x, offRuler: horizontal ? sy > R : sx > R };
        cursorAt = { sx, sy };
      };
      const up = (e: PointerEvent) => {
        e.stopPropagation();
        node.releasePointerCapture?.(e.pointerId);
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        const g = draft;
        draft = null;
        if (!g || !onguide) return;
        const { orientation, position, index } = g;
        if (index == null) {
          if (g.offRuler) onguide({ action: 'add', orientation, position });
        } else if (!g.offRuler) onguide({ action: 'remove', index, orientation, position });
        else onguide({ action: 'move', index, orientation, position });
      };
      const down = (e: PointerEvent) => {
        if (e.button !== 0 || !onguide) return;
        const g = start(e);
        if (!g) return;
        e.stopPropagation();
        e.preventDefault();
        node.setPointerCapture?.(e.pointerId);
        draft = { ...g, offRuler: g.index != null };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', up);
        node.addEventListener('pointercancel', up);
      };
      node.addEventListener('pointerdown', down);
      return () => node.removeEventListener('pointerdown', down);
    };
  }
  const fromTopRuler = guideDrag(() => ({ orientation: 'horizontal', position: (0 - panY) / zoom }));
  const fromLeftRuler = guideDrag(() => ({ orientation: 'vertical', position: (0 - panX) / zoom }));
  const onGuide = (index: number) => guideDrag(() => ({ ...guides[index], index }));

  // Spread, not an attribute: svelte's a11y lint counts role="application" as
  // non-interactive and flags tabindex=0, yet a focusable free-form canvas is
  // exactly what that role is for.
  const TAB_STOP = { tabindex: 0 };

  const stageCursor = $derived(panning ? 'grabbing' : spaceDown || pan ? 'grab' : (cursor ?? 'default'));
</script>

<div
  bind:this={root}
  bind:clientWidth={vw}
  bind:clientHeight={vh}
  role="application"
  aria-label={label}
  {...TAB_STOP}
  data-slot="canvas-viewport"
  class={cn(
    'relative size-full touch-none select-none overflow-hidden bg-ripple-muted/40 outline-none',
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ripple-ring/60',
    className
  )}
  style:cursor={stageCursor}
>
  <div
    data-slot="artboard"
    class={cn('craft-artboard', artboard && 'craft-artboard-frame', checkerboard && 'craft-checker')}
    style:transform="translate({panX}px, {panY}px)"
    style:width="{docWidth * zoom}px"
    style:height="{docHeight * zoom}px"
  >
    <div
      data-slot="artboard-content"
      class="craft-artboard-content"
      style:width="{docWidth}px"
      style:height="{docHeight}px"
      style:transform="scale({zoom})"
    >
      {@render children?.()}
    </div>
  </div>
  {#if overlay}
    <div data-slot="viewport-overlay" class="pointer-events-none absolute inset-0">
      {@render overlay({ zoom, panX, panY, width: vw, height: vh })}
    </div>
  {/if}
  {#if guides.length || draft}
    <div data-slot="viewport-guides" class="pointer-events-none absolute inset-0">
      {#each guides as g, i (i)}
        {@const p = guideScreen(g)}
        {#if draft?.index !== i}
          <div
            {@attach onGuide(i)}
            data-guide={g.orientation}
            class={cn('craft-guide', g.orientation, guidesEditable && onguide && 'editable')}
            style={safeStyle(g.orientation === 'horizontal' ? `top:${p}px` : `left:${p}px`)}
          ></div>
        {/if}
      {/each}
      {#if draft}
        <div class={cn('craft-guide', draft.orientation, 'dragging', !draft.offRuler && 'removing')} style={safeStyle(draft.orientation === 'horizontal' ? `top:${guideScreen(draft)}px` : `left:${guideScreen(draft)}px`)}></div>
      {/if}
    </div>
  {/if}
  {#if rulers && ticksX && ticksY}
    <div data-slot="ruler-top" {@attach fromTopRuler} class="craft-ruler absolute inset-x-0 top-0 cursor-row-resize" style:height="{R}px" title="Drag down to add a guide">
      <svg class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {#if selX}<rect x={selX[0]} y="0" width={Math.max(1, selX[1] - selX[0])} height={R} class="craft-ruler-sel" />{/if}
        {#each ticksX.minor as x (x)}<line x1={x} x2={x} y1={R - 4} y2={R} class="craft-tick" />{/each}
        {#each ticksX.major as m (m.px)}
          <line x1={m.px} x2={m.px} y1="0" y2={R} class="craft-tick" />
          <text x={m.px + 3} y="9" class="craft-ruler-label">{m.label}</text>
        {/each}
        {#if cursorAt}<line x1={cursorAt.sx} x2={cursorAt.sx} y1="0" y2={R} class="craft-ruler-cursor" />{/if}
      </svg>
    </div>
    <div data-slot="ruler-left" {@attach fromLeftRuler} class="craft-ruler absolute inset-y-0 left-0 cursor-col-resize" style:width="{R}px" title="Drag right to add a guide">
      <svg class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {#if selY}<rect x="0" y={selY[0]} width={R} height={Math.max(1, selY[1] - selY[0])} class="craft-ruler-sel" />{/if}
        {#each ticksY.minor as y (y)}<line y1={y} y2={y} x1={R - 4} x2={R} class="craft-tick" />{/each}
        {#each ticksY.major as m (m.px)}
          <line y1={m.px} y2={m.px} x1="0" x2={R} class="craft-tick" />
          <text x="9" y={m.px + 3} transform="rotate(-90 9 {m.px + 3})" text-anchor="end" class="craft-ruler-label">{m.label}</text>
        {/each}
        {#if cursorAt}<line y1={cursorAt.sy} y2={cursorAt.sy} x1="0" x2={R} class="craft-ruler-cursor" />{/if}
      </svg>
    </div>
    <div data-slot="ruler-corner" class="craft-ruler craft-ruler-corner absolute left-0 top-0 flex items-center justify-center" style:width="{R}px" style:height="{R}px">
      <span class="text-[9px] font-medium text-ripple-muted-foreground">{rulerUnit}</span>
    </div>
  {/if}
</div>

<style>
  .craft-artboard {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  .craft-artboard-frame {
    box-shadow:
      0 0 0 1px color-mix(in oklab, var(--ripple-surface-foreground) 10%, transparent),
      0 4px 16px color-mix(in oklab, var(--ripple-surface-foreground) 14%, transparent);
  }
  .craft-checker {
    background: repeating-conic-gradient(
        color-mix(in oklab, var(--ripple-surface-foreground) 9%, transparent) 0 25%,
        transparent 0 50%
      )
      0 0 / 16px 16px;
  }
  .craft-artboard-content {
    transform-origin: 0 0;
  }
  /* In-flow chrome: the surface family follows the host's light and dark
     themes (--ripple-popover is a floating layer, dark glass in some hosts). */
  .craft-ruler {
    background: color-mix(in oklab, var(--ripple-surface) 85%, var(--ripple-muted));
    backdrop-filter: blur(12px);
    touch-action: none;
  }
  [data-slot='ruler-top'] {
    box-shadow: inset 0 -1px 0 var(--ripple-border);
  }
  [data-slot='ruler-left'] {
    box-shadow: inset -1px 0 0 var(--ripple-border);
  }
  .craft-ruler-corner {
    z-index: 1;
    box-shadow: inset -1px -1px 0 var(--ripple-border);
  }
  .craft-tick {
    stroke: color-mix(in oklab, var(--ripple-surface-foreground) 40%, transparent);
    stroke-width: 1;
    shape-rendering: crispEdges;
  }
  .craft-ruler-label {
    fill: var(--ripple-muted-foreground);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .craft-ruler-sel {
    fill: color-mix(in oklab, var(--ripple-accent) 22%, transparent);
  }
  .craft-ruler-cursor {
    stroke: var(--ripple-accent);
    stroke-width: 1;
    shape-rendering: crispEdges;
  }
  .craft-guide {
    position: absolute;
    background: color-mix(in oklab, var(--ripple-accent) 85%, transparent);
  }
  .craft-guide.horizontal {
    left: 0;
    right: 0;
    height: 1px;
  }
  .craft-guide.vertical {
    top: 0;
    bottom: 0;
    width: 1px;
  }
  /* A wider invisible hit strip for grabbing an editable guide. */
  .craft-guide.editable {
    pointer-events: auto;
    background-clip: content-box;
  }
  .craft-guide.editable.horizontal {
    height: 7px;
    margin-top: -3px;
    padding: 3px 0;
    cursor: row-resize;
  }
  .craft-guide.editable.vertical {
    width: 7px;
    margin-left: -3px;
    padding: 0 3px;
    cursor: col-resize;
  }
  .craft-guide.removing {
    opacity: 0.35;
  }
</style>
