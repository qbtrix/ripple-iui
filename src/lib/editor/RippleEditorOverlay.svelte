<!--
  @file editor/RippleEditorOverlay.svelte
  @description L2 (Svelte) selection + hover overlay for the Ripple visual editor.
    Given a render `container` (the element wrapping a mounted <Ripple>), it:
      - delegates ONE click + ONE mousemove (+ mouseleave) listener on the
        container, resolving the event target to a node id via the L1
        `resolveElementToNodeId` (SELECT-PARENT ancestor walk for the widgets
        that don't forward `id`), and updates an `EditorSelection`;
      - draws an absolutely-positioned selection box and hover box using the L1
        `BoundsIndex` (id -> container-relative Rect) + `rectToStyle`.
    Re-measures the index on mount, whenever `renderVersion` changes (the host
    bumps it after a spec edit / re-render — the renderVersion-guard idea lifted
    from svelte-visual-builder's BuilderPreview), and on container resize
    (ResizeObserver, feature-detected so jsdom doesn't crash). The overlay is
    `pointer-events: none` so it never eats clicks; the listeners live on the
    container, and the overlay needs a positioned ancestor shared with the
    container so box coordinates line up.

    SCOPE (SP-1a): selection + overlay ONLY. No inline text edit (SP-1b), no
    drag/drop (SP-1c), no persistence. Pixel-correct box positioning needs
    BROWSER confirmation — jsdom returns zero rects.
  @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
-->
<script lang="ts">
  import { buildBoundsIndex, resolveElementToNodeId, BoundsIndex } from './core/bounds-index.js';
  import { rectToStyle } from './core/geometry.js';
  import { EditorSelection } from './editor-selection.svelte.js';

  interface Props {
    /** Element wrapping the mounted <Ripple> whose nodes are measured/selected. */
    container?: HTMLElement | null;
    /** Shared selection store; one is created if omitted. */
    selection?: EditorSelection;
    /** Bump to force a re-measure after a spec edit / re-render. */
    renderVersion?: number;
    /** Node ids known from the spec — the precise id allow-list for resolution. */
    knownIds?: Set<string> | null;
    /** When false, listeners detach and the boxes hide (preview mode). */
    enabled?: boolean;
    /** Fired after a click resolves (id, or null when clicking empty space). */
    onselect?: (id: string | null) => void;
    /** Fired as the hovered node changes (id or null). */
    onhover?: (id: string | null) => void;
  }

  let {
    container = null,
    selection = new EditorSelection(),
    renderVersion = 0,
    knownIds = null,
    enabled = true,
    onselect,
    onhover
  }: Props = $props();

  let index = $state<BoundsIndex | null>(null);
  // Local re-measure trigger, bumped by the ResizeObserver. Combined with the
  // host's `renderVersion` and `knownIds` to drive the measure effect.
  let measureTick = $state(0);

  // Re-measure whenever the container, the host's renderVersion, the knownIds
  // set, or the resize tick changes. The reads below are tracked dependencies.
  $effect(() => {
    void renderVersion;
    void measureTick;
    void knownIds;
    if (!container) {
      index = null;
      return;
    }
    index = buildBoundsIndex(container, { knownIds });
  });

  // Delegate the interaction listeners on the container + observe its size.
  // Everything is torn down via the returned cleanup, so re-running on a
  // container/enabled change never leaks listeners.
  $effect(() => {
    const el = container;
    if (!el || !enabled) return;

    const onClick = (e: MouseEvent) => {
      const id = resolveElementToNodeId(e.target as Element | null, { knownIds, boundary: el });
      selection.select(id);
      onselect?.(id);
    };
    const onMove = (e: MouseEvent) => {
      const id = resolveElementToNodeId(e.target as Element | null, { knownIds, boundary: el });
      if (id !== selection.hoverId) {
        selection.hover(id);
        onhover?.(id);
      }
    };
    const onLeave = () => {
      if (selection.hoverId !== null) {
        selection.hover(null);
        onhover?.(null);
      }
    };

    el.addEventListener('click', onClick);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measureTick++;
      });
      ro.observe(el);
    }

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      ro?.disconnect();
    };
  });

  const selectedRect = $derived(
    enabled && index && selection.selectedId ? (index.get(selection.selectedId) ?? null) : null
  );
  // Hide the hover box when it would sit exactly under the selection box.
  const hoverRect = $derived(
    enabled && index && selection.hoverId && selection.hoverId !== selection.selectedId
      ? (index.get(selection.hoverId) ?? null)
      : null
  );
</script>

<div class="ripple-editor-overlay" data-ripple-editor-overlay aria-hidden="true">
  {#if hoverRect}
    <div class="ripple-editor-box ripple-editor-box--hover" style={rectToStyle(hoverRect)}></div>
  {/if}
  {#if selectedRect}
    <div class="ripple-editor-box ripple-editor-box--selected" style={rectToStyle(selectedRect)}>
      {#if selection.selectedId}
        <span class="ripple-editor-tag">{selection.selectedId}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ripple-editor-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
    z-index: 50;
  }
  .ripple-editor-box {
    position: absolute;
    box-sizing: border-box;
    border-radius: 3px;
    pointer-events: none;
    transition:
      left 80ms ease,
      top 80ms ease,
      width 80ms ease,
      height 80ms ease;
  }
  .ripple-editor-box--hover {
    border: 1px dashed color-mix(in oklab, #3b82f6 55%, transparent);
    background: color-mix(in oklab, #3b82f6 8%, transparent);
  }
  .ripple-editor-box--selected {
    border: 2px solid #3b82f6;
    box-shadow: 0 0 0 1px color-mix(in oklab, #3b82f6 35%, transparent);
  }
  .ripple-editor-tag {
    position: absolute;
    top: -1.45rem;
    left: -2px;
    font: 600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #fff;
    background: #3b82f6;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
  }
</style>
