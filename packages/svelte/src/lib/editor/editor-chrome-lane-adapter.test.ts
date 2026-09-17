// editor/editor-chrome-lane-adapter.test.ts
// @description EP-2 integration test (jsdom): a SINGLE LaneAdapter — one
//   RippleLaneAdapter over ONE spec — drives all three chrome pieces, proving the
//   whole chrome shares one port seam over one substrate after the EP-2 migration:
//     • SELECTION  — clicking a node in the overlay resolves through adapter.resolveElement;
//     • EDIT       — double-click + Enter in the inline editor writes through adapter.applyEdit(setText);
//     • REORDER    — dragging the selected node's grip writes through adapter.applyEdit(moveChild).
//   All three mutate the same root object, and every edit flows through the single
//   adapter's onApplied. jsdom returns zero rects, so the drag's bounds + drop math
//   run over a stubbed getBoundingClientRect (the pure drop math is unit-tested in
//   core/drag-reorder.test.ts); here we assert the COMPONENT path writes the spec.
// @created 2026-06-30 (EP-2 — chrome migrated onto the LaneAdapter port)
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findById, type UINode } from '@ripple-ui/core';
import { RippleLaneAdapter } from './core/index.js';
import Overlay from './RippleEditorOverlay.svelte';
import InlineEditor from './RippleInlineEditor.svelte';
import DragLayer from './RippleDragLayer.svelte';
import { createEditorSelection } from './editor-selection.svelte.js';

// A vertical stack of three id-bearing leaves so a reorder is observable.
function makeRoot(): UINode {
  return {
    type: 'container',
    id: 'n_root0001',
    children: [
      { type: 'heading', id: 'n_head0001', props: { text: 'Title', level: 2 } },
      { type: 'text', id: 'n_text0001', props: { text: 'Body' } },
      { type: 'button', id: 'n_btn00001', props: { label: 'Go' } }
    ]
  };
}

function makeStage(): HTMLElement {
  const stage = document.createElement('div');
  stage.innerHTML =
    '<h2 id="n_head0001">Title</h2>' +
    '<p id="n_text0001">Body</p>' +
    '<button id="n_btn00001">Go</button>';
  document.body.appendChild(stage);
  return stage;
}

const knownIds = new Set(['n_root0001', 'n_head0001', 'n_text0001', 'n_btn00001']);

// jsdom returns zero rects; stub a vertical stack (stage = origin (0,0); each leaf
// a 100px row) so buildBoundsIndex + resolveSiblingDrop resolve a real drop.
function stubRects(stage: HTMLElement) {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    }) as DOMRect;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 200, 300));
  const rows: Record<string, number> = { n_head0001: 0, n_text0001: 100, n_btn00001: 200 };
  for (const [id, top] of Object.entries(rows)) {
    const el = stage.querySelector(`#${id}`) as HTMLElement;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(0, top, 200, 100));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('EP-2 — one LaneAdapter drives selection + edit + reorder over one spec', () => {
  it('overlay selects, inline edits, and drag reorders through the SAME adapter', async () => {
    const root = makeRoot();
    const stage = makeStage();
    stubRects(stage);

    // ONE adapter, ONE selection — shared by every chrome piece, exactly as the lab.
    const onApplied = vi.fn();
    const adapter = new RippleLaneAdapter({
      getRoot: () => root,
      knownIds,
      getBoundary: () => stage,
      onApplied
    });
    const selection = createEditorSelection();
    const renderVersion = 0; // static here; the lab bumps it off onApplied

    const onselect = vi.fn();
    const onreorder = vi.fn();
    render(Overlay, {
      props: { adapter, container: stage, selection, knownIds, renderVersion, onselect }
    });
    render(InlineEditor, { props: { adapter, container: stage, selection } });
    render(DragLayer, {
      props: { adapter, container: stage, selection, getRoot: () => root, knownIds, renderVersion, onreorder }
    });
    await tick();

    const headingEl = stage.querySelector('#n_head0001') as HTMLElement;

    // 1) SELECTION via the overlay — click resolves through adapter.resolveElement.
    await fireEvent.click(headingEl);
    expect(selection.selectedId).toBe('n_head0001');
    expect(onselect).toHaveBeenCalledWith('n_head0001');

    // 2) EDIT via the inline editor — dblclick + Enter writes through adapter.applyEdit.
    await fireEvent.dblClick(headingEl);
    headingEl.textContent = 'Renamed';
    await fireEvent.keyDown(headingEl, { key: 'Enter' });
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Renamed');

    // 3) REORDER via the drag layer — select the button, grab its grip, drag to the
    //    top, drop. The reorder writes through adapter.applyEdit({kind:moveChild}).
    selection.select('n_btn00001');
    await tick();
    const grip = document.querySelector('.ripple-drag-handle') as HTMLElement;
    expect(grip).toBeTruthy(); // grip shows for the selected reorderable node

    // Plain MouseEvents (jsdom may lack PointerEvent); the handlers only read
    // clientX/clientY + preventDefault/stopPropagation, all present on MouseEvent.
    grip.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 5, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 5, clientY: 10 }));
    await tick();

    // Button moved to the front; the SAME root reflects ALL three operations.
    expect(findById(root, 'n_root0001')?.children?.map((c) => c?.id)).toEqual([
      'n_btn00001',
      'n_head0001',
      'n_text0001'
    ]);
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Renamed'); // edit survived
    expect(onreorder).toHaveBeenCalledWith({
      node_id: 'n_btn00001',
      new_parent_id: 'n_root0001',
      after_id: ''
    });

    // Every mutation flowed through the single adapter's onApplied (edit + reorder;
    // the overlay click selects only, so it adds no op).
    expect(onApplied).toHaveBeenCalledTimes(2);
  });
});
