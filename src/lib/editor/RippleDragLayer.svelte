<!--
  @file editor/RippleDragLayer.svelte
  @description L2 (Svelte) drag-to-reorder layer for the Ripple visual editor
    (editor chrome PIECE 2). Renders a small GRIP HANDLE at the corner of the
    currently-SELECTED node (only when it has reorderable siblings). Pointer-down
    on the grip starts a pointer drag; pointer-move resolves the drop gap among
    the node's siblings via the L1 `resolveSiblingDrop` and draws a drop-indicator
    line; pointer-up emits one `moveChild` edit through the LaneAdapter port.

    Why a grip handle and not the whole selected box: the layer is
    `pointer-events: none` except for the grip, so normal selection clicks (and
    clicks on child widgets) are never swallowed — only the grip is interactive.

    SCOPE v1: SAME-PARENT sibling reorder. `resolveSiblingDrop` only ever returns
    the node's current parent, so this never re-homes across containers — that is
    a FOLLOW-UP. Box geometry needs a real browser (jsdom returns zero rects); the
    drop MATH is unit-tested in `core/drag-reorder.test.ts`, the FEEL is not.
  @created 2026-06-30 (editor chrome PIECE 2 — drag-to-reorder siblings)
  @changes 2026-06-30 (EP-2): the reorder now WRITES through the LaneAdapter port
    (`adapter.applyEdit(parentRef, { kind: 'moveChild', childUid, toIndex })`)
    instead of the direct `ops.apply(nodeMovedOp(...))`; `adapter.listChildren`
    converts the drop math's `after_id` to the adapter's `toIndex`. The drop MATH
    + indicator are unchanged — `getRoot` stays for the read-only sibling/parent
    walk the port doesn't expose, and `knownIds` stays purely for buildBoundsIndex
    geometry. Behavior is byte-identical to the pre-port layer.
-->
<script lang="ts">
  import { buildBoundsIndex, BoundsIndex } from './core/bounds-index.js';
  import {
    resolveSiblingDrop,
    siblingResolverFromRoot,
    type DropTarget
  } from './core/drag-reorder.js';
  import type { EditorSelection } from './editor-selection.svelte.js';
  import type { LaneAdapter, TargetRef } from './core/lane-adapter.js';
  import type { UINode } from '../schema/ui-spec.js';

  interface Props {
    /** The lane adapter the reorder WRITES through (its only port seam). */
    adapter: LaneAdapter;
    /** Element wrapping the mounted <Ripple> whose nodes are measured/reordered. */
    container?: HTMLElement | null;
    /** Shared selection store — the selected node is the draggable one. */
    selection: EditorSelection;
    /**
     * Live root accessor — sibling/parent resolution walks it (findParent), which
     * the port deliberately doesn't expose (it walks children, not parents). The
     * WRITE goes through the adapter; this stays for the read-only drop MATH.
     */
    getRoot: () => UINode | null | undefined;
    /** Node ids known from the spec — the id allow-list for GEOMETRY (buildBoundsIndex). */
    knownIds?: Set<string> | null;
    /** Bump to force a re-measure after a spec edit / re-render. */
    renderVersion?: number;
    /** When false, the handle hides and dragging is disabled (preview mode). */
    enabled?: boolean;
    /** Fired after a reorder op is emitted. */
    onreorder?: (target: DropTarget & { node_id: string }) => void;
  }

  let {
    adapter,
    container = null,
    selection,
    getRoot,
    knownIds = null,
    renderVersion = 0,
    enabled = true,
    onreorder
  }: Props = $props();

  const resolveSiblings = siblingResolverFromRoot(() => getRoot());
  // Lane-scoped ref for a node id (the adapter stamps the lane).
  const refOf = (uid: string): TargetRef => ({ uid, lane: adapter.id });

  let index = $state<BoundsIndex | null>(null);
  let measureTick = $state(0);

  // Imperative drag bookkeeping (not render state).
  let draggedId = '';
  let dragging = $state(false);
  let indicator = $state<{ left: number; top: number; width: number; height: number } | null>(null);

  // Re-measure on container / renderVersion / knownIds / resize (same pattern as
  // the overlay). The DOM is stable during a drag, so no re-measure mid-drag.
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

  $effect(() => {
    const el = container;
    if (!el) return;
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measureTick++);
      ro.observe(el);
    }
    return () => ro?.disconnect();
  });

  // The selected node's rect, and whether it has siblings to reorder against.
  const selectedRect = $derived(
    enabled && index && selection.selectedId ? (index.get(selection.selectedId) ?? null) : null
  );
  const reorderable = $derived.by(() => {
    if (!enabled || !selection.selectedId) return false;
    const ps = resolveSiblings(selection.selectedId);
    return !!ps && ps.siblingIds.length > 1;
  });

  const handleStyle = $derived(
    selectedRect
      ? `left:${selectedRect.left + selectedRect.width - 22}px;top:${selectedRect.top + 2}px;`
      : ''
  );
  const indicatorStyle = $derived(
    indicator
      ? `left:${indicator.left}px;top:${indicator.top}px;width:${indicator.width}px;height:${indicator.height}px;`
      : ''
  );

  // Thin line for the resolved drop gap. Anchored at the top/left of the first
  // sibling (after_id === '') or the bottom/right of the after_id sibling, axis
  // auto-detected from the sibling spread (matches the L1 resolver).
  function computeIndicator(target: DropTarget): typeof indicator {
    const idx = index;
    if (!idx) return null;
    const ps = resolveSiblings(draggedId);
    if (!ps) return null;
    const others = ps.siblingIds.filter((id) => id !== draggedId && idx.get(id));
    if (others.length === 0) return null;
    const rects = others.map((id) => idx.get(id)!);
    const cx = rects.map((r) => r.left + r.width / 2);
    const cy = rects.map((r) => r.top + r.height / 2);
    const horizontal = Math.max(...cx) - Math.min(...cx) > Math.max(...cy) - Math.min(...cy);
    const THICK = 2;
    if (target.after_id === '') {
      const f = rects[0];
      return horizontal
        ? { left: f.left - 1, top: f.top, width: THICK, height: f.height }
        : { left: f.left, top: f.top - 1, width: f.width, height: THICK };
    }
    const a = idx.get(target.after_id);
    if (!a) return null;
    return horizontal
      ? { left: a.right - 1, top: a.top, width: THICK, height: a.height }
      : { left: a.left, top: a.bottom - 1, width: a.width, height: THICK };
  }

  function pointerToContainer(e: PointerEvent): { x: number; y: number } | null {
    if (!container) return null;
    const r = container.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onMove(e: PointerEvent) {
    if (!dragging || !index) return;
    const p = pointerToContainer(e);
    if (!p) return;
    const target = resolveSiblingDrop(index, draggedId, p, resolveSiblings);
    indicator = target ? computeIndicator(target) : null;
  }

  function onUp(e: PointerEvent) {
    window.removeEventListener('pointermove', onMove);
    const p = pointerToContainer(e);
    const target = p && index ? resolveSiblingDrop(index, draggedId, p, resolveSiblings) : null;
    const dragged = draggedId;
    dragging = false;
    indicator = null;
    draggedId = '';
    if (target && dragged) {
      // Emit the reorder THROUGH THE PORT. The drop math yields `after_id` (the
      // sibling to land behind); the adapter's moveChild takes a FINAL `toIndex`
      // over the siblings WITHOUT the dragged node, so convert via the parent's
      // children (adapter.listChildren): toIndex = position of after_id in that
      // rest list + 1 ('' = front = 0). The adapter then recomputes the exact same
      // after_id, so the emitted node_moved is byte-identical to the pre-port
      // `ops.apply(nodeMovedOp(dragged, target))`.
      const parentRef = refOf(target.new_parent_id);
      const rest = adapter
        .listChildren(parentRef)
        .map((r) => r.uid)
        .filter((uid) => uid !== dragged);
      const toIndex = target.after_id === '' ? 0 : rest.indexOf(target.after_id) + 1;
      const ok = adapter.applyEdit(parentRef, { kind: 'moveChild', childUid: dragged, toIndex });
      if (ok) onreorder?.({ node_id: dragged, ...target });
    }
  }

  function onHandleDown(e: PointerEvent) {
    if (!enabled || !selection.selectedId || !index) return;
    e.preventDefault();
    e.stopPropagation(); // don't let the overlay treat this as a selection click
    draggedId = selection.selectedId;
    dragging = true;
    indicator = null;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  // Safety net: drop any window listeners if we unmount mid-drag.
  $effect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  });
</script>

<div class="ripple-drag-layer" data-ripple-drag-layer aria-hidden="true">
  {#if enabled && reorderable && selectedRect && !dragging}
    <button
      type="button"
      class="ripple-drag-handle"
      style={handleStyle}
      title="Drag to reorder"
      aria-label="Drag to reorder"
      onpointerdown={onHandleDown}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="2" r="1.1" /><circle cx="9" cy="2" r="1.1" />
        <circle cx="3" cy="6" r="1.1" /><circle cx="9" cy="6" r="1.1" />
        <circle cx="3" cy="10" r="1.1" /><circle cx="9" cy="10" r="1.1" />
      </svg>
    </button>
  {/if}

  {#if dragging && indicator}
    <div class="ripple-drop-indicator" style={indicatorStyle}></div>
  {/if}
</div>

<style>
  .ripple-drag-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
    /* Above the selection overlay (z-50) so the grip is reachable. */
    z-index: 60;
  }
  .ripple-drag-handle {
    position: absolute;
    pointer-events: auto;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    color: #fff;
    background: #3b82f6;
    border: none;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    cursor: grab;
  }
  .ripple-drag-handle:active {
    cursor: grabbing;
  }
  .ripple-drop-indicator {
    position: absolute;
    pointer-events: none;
    background: #3b82f6;
    border-radius: 2px;
    box-shadow: 0 0 0 1px color-mix(in oklab, #3b82f6 35%, transparent);
  }
</style>
