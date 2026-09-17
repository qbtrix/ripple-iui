// editor/RippleInlineEditor.test.ts
// @description Component test for the inline editor (jsdom) AFTER EP-3 — the editor
//   MOUNTING is now behind the pluggable `InlineEditor` slot, but ripple behavior is
//   unchanged, so the original EP-2 assertions still hold. It drives a real container
//   DOM through the dblclick -> edit -> commit / cancel lifecycle while touching ONLY
//   the port: a single-text widget enters contenteditable on double-click and selects
//   the node; Enter commits exactly one node_prop_set (the adapter maps setText -> the
//   node's primary text prop); Escape cancels with no op and restores the original
//   text; an unchanged edit emits nothing; and a non-inline widget never enters edit.
//   A spy-adapter case proves the port CONTRACT (the editor sends a {kind:'setText'}
//   EditOp). A fake-InlineEditor case proves the SLOT CONTRACT (EP-3): the controller
//   mounts the lane's editor, routes its onCommit -> applyEdit(setText) and onCancel ->
//   no-op, and destroys it on re-entry / unmount — asserted via the double, free of
//   TipTap's jsdom quirks. The contenteditable INTERACTION FEEL (caret, IME,
//   select-all) is out of jsdom's reach — covered by the "needs browser
//   confirmation" list, not here.
// @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
// @changes 2026-06-30 (EP-2): migrated off getNode/ops props onto an `adapter`
//   prop. Tests now drive a real RippleLaneAdapter over a synthetic root (writes
//   round-trip the root + fire onApplied) plus one spy-adapter case asserting the
//   setText EditOp the editor sends through the port.
// @changes 2026-06-30 (EP-3): added a fake-InlineEditor double registered under the
//   'squire' kind (EP-4's mechanism), proving the controller delegates mount /
//   onCommit / onCancel / destroy to the slot without editing the controller.
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findById, type UINode } from '@ripple-ui/core';
import type { InlineEditor as InlineEditorSlot } from './core/index.js';
import { RippleLaneAdapter, registerInlineEditor, type EditableNode, type InlineEditorMountOpts, type LaneAdapter, type TargetRef } from './core/index.js';
import InlineEditor from './RippleInlineEditor.svelte';
import { createEditorSelection } from './editor-selection.svelte.js';

const ref = (uid: string): TargetRef => ({ uid, lane: 'ripple' });

// Build a container holding id-bearing elements and append it to the document
// (the component attaches its dblclick listener to this container, separate from
// testing-library's own render root).
function makeStage(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

// A real ripple adapter over a synthetic root, bounded to the stage — the inline
// editor resolves / reads / writes through it exactly as in the lab. onApplied
// counts the wire ops the adapter applies (the post-port equivalent of spying the
// old EditorOps seam).
function realAdapter(root: UINode, stage: HTMLElement) {
  const knownIds = new Set<string>();
  const walk = (n: UINode | null | undefined) => {
    if (!n) return;
    if (n.id) knownIds.add(n.id);
    n.children?.forEach((c) => walk(c as UINode));
  };
  walk(root);
  const onApplied = vi.fn();
  const adapter = new RippleLaneAdapter({
    getRoot: () => root,
    knownIds,
    getBoundary: () => stage,
    onApplied
  });
  return { adapter, onApplied };
}

const headingRoot = (): UINode => ({
  type: 'container',
  id: 'n_root0001',
  children: [{ type: 'heading', id: 'n_head0001', props: { text: 'Editor Lab', level: 2 } }]
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RippleInlineEditor — double-click to edit a single-text widget', () => {
  it('enters contenteditable, selects the node, and Enter commits one node_prop_set', async () => {
    const root = headingRoot();
    const stage = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const selection = createEditorSelection();
    const { adapter, onApplied } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage, selection } });
    await tick();

    await fireEvent.dblClick(heading);
    expect(heading.getAttribute('contenteditable')).toBe('true');
    expect(heading.getAttribute('data-ripple-editing')).toBe('n_head0001');
    expect(selection.selectedId).toBe('n_head0001');

    // Simulate the user editing the contenteditable text, then pressing Enter.
    heading.textContent = 'New Title';
    await fireEvent.keyDown(heading, { key: 'Enter' });

    // setText routed to the primary text prop -> exactly one node_prop_set.
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(onApplied).toHaveBeenCalledWith({
      action: 'node_prop_set',
      node_id: 'n_head0001',
      prop: 'text',
      value: 'New Title'
    });
    expect(findById(root, 'n_head0001')?.props?.text).toBe('New Title');
    // Edit mode torn down after commit.
    expect(heading.hasAttribute('contenteditable')).toBe(false);
  });

  it('commits on blur', async () => {
    const root = headingRoot();
    const stage = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const { adapter } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(heading);
    heading.textContent = 'Blurred Title';
    await fireEvent.blur(heading);

    expect(findById(root, 'n_head0001')?.props?.text).toBe('Blurred Title');
  });

  it('Escape cancels — no op applied, original text restored', async () => {
    const root = headingRoot();
    const stage = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const { adapter, onApplied } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(heading);
    heading.textContent = 'Discarded';
    await fireEvent.keyDown(heading, { key: 'Escape' });

    expect(onApplied).not.toHaveBeenCalled();
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Editor Lab'); // model unchanged
    expect(heading.textContent).toBe('Editor Lab'); // DOM restored
    expect(heading.hasAttribute('contenteditable')).toBe(false);
  });

  it('does not emit an op when the text is unchanged', async () => {
    const root = headingRoot();
    const stage = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const { adapter, onApplied } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(heading);
    await fireEvent.keyDown(heading, { key: 'Enter' }); // committed without editing

    expect(onApplied).not.toHaveBeenCalled();
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Editor Lab');
  });
});

describe('RippleInlineEditor — non-inline widgets', () => {
  it('selects but does not enter edit mode for a composite widget', async () => {
    const root: UINode = {
      type: 'container',
      id: 'n_root0001',
      children: [{ type: 'card', id: 'n_card0001', props: { title: 'A card' } }]
    };
    const stage = makeStage('<div id="n_card0001">A card</div>');
    const card = stage.querySelector('#n_card0001') as HTMLElement;
    const selection = createEditorSelection();
    const { adapter, onApplied } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage, selection } });
    await tick();

    await fireEvent.dblClick(card);

    expect(selection.selectedId).toBe('n_card0001'); // still selectable
    expect(card.hasAttribute('contenteditable')).toBe(false); // but not editable inline
    expect(onApplied).not.toHaveBeenCalled();
  });
});

describe('RippleInlineEditor — rich-text path teardown (regression: stuck editing outline)', () => {
  // The rich path sets data-ripple-editing synchronously in beginRichEdit (before
  // the async TipTap import), so this reproduces the stuck-outline bug WITHOUT a
  // mounted editor: enter rich edit, then commit by double-clicking a different
  // node (the editor commits the prior session first). commit() guards a null
  // editor, so the rich commit branch runs deterministically. Before the fix the
  // branch never removed the attribute, leaving the indigo outline stuck.
  it('committing a rich edit clears data-ripple-editing', async () => {
    const root: UINode = {
      type: 'container',
      id: 'n_root0001',
      children: [
        { type: 'richtext', id: 'n_prose001', props: { html: '<p>Hi</p>' } },
        { type: 'heading', id: 'n_head0001', props: { text: 'T', level: 2 } }
      ]
    };
    const stage = makeStage('<div id="n_prose001"><p>Hi</p></div><h2 id="n_head0001">T</h2>');
    const prose = stage.querySelector('#n_prose001') as HTMLElement;
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const { adapter } = realAdapter(root, stage);

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(prose);
    expect(prose.getAttribute('data-ripple-editing')).toBe('n_prose001'); // entered rich edit

    // Commit the rich session by double-clicking a different node.
    await fireEvent.dblClick(heading);
    await tick();

    // The outline affordance must be gone after commit (was the bug).
    expect(prose.hasAttribute('data-ripple-editing')).toBe(false);
  });
});

describe('RippleInlineEditor — sends a setText EditOp through the port', () => {
  // A spy adapter proves WHAT the editor sends through the port (mirrors
  // RippleInspector.test.ts's spy section) — no real substrate. findNodeElement
  // still runs against the real stage DOM; only the port calls are spied.
  it('commits via adapter.applyEdit({kind:setText}) with the harvested text', async () => {
    const stage = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = stage.querySelector('#n_head0001') as HTMLElement;
    const headingNode: EditableNode = {
      uid: 'n_head0001',
      type: 'heading',
      props: { text: 'Editor Lab', level: 2 },
      text: 'Editor Lab',
      childUids: []
    };
    const applyEdit = vi.fn(() => true);
    const adapter: LaneAdapter = {
      id: 'ripple',
      resolveElement: (el) => (el.closest('#n_head0001') ? ref('n_head0001') : null),
      readNode: () => headingNode,
      readProp: () => undefined,
      listChildren: () => [],
      getFields: () => [],
      applyEdit
    };

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(heading);
    heading.textContent = 'New Title';
    await fireEvent.keyDown(heading, { key: 'Enter' });

    expect(applyEdit).toHaveBeenCalledWith(ref('n_head0001'), { kind: 'setText', html: 'New Title' });
  });
});

// A no-op InlineEditor double — captures the mount opts it receives and counts
// destroys, so the EP-3 SLOT CONTRACT can be asserted without TipTap's async jsdom
// path. Each mount returns its own handle but shares the destroy counter.
function makeFakeInlineEditor() {
  const mounts: InlineEditorMountOpts[] = [];
  let destroys = 0;
  const editor: InlineEditorSlot = {
    mount(_el, opts) {
      mounts.push(opts);
      return {
        destroy() {
          destroys += 1;
        }
      };
    }
  };
  return { editor, mounts, getDestroys: () => destroys };
}

// A spy adapter over two richtext nodes. `inlineEditor: 'squire'` routes the rich
// path to whatever is registered under 'squire' — the fake double here, the real
// Squire/overlay impl in EP-4 — WITHOUT the controller knowing either.
function richSpyAdapter() {
  const applyEdit = vi.fn(() => true);
  const seed = (uid: string) => (uid === 'n_prose001' ? '<p>A</p>' : '<p>B</p>');
  const node = (uid: string): EditableNode => ({
    uid,
    type: 'richtext',
    props: { html: seed(uid) },
    text: seed(uid),
    childUids: []
  });
  const adapter: LaneAdapter = {
    id: 'ripple',
    inlineEditor: 'squire',
    resolveElement: (el) => {
      if (el.closest('#n_prose001')) return ref('n_prose001');
      if (el.closest('#n_prose002')) return ref('n_prose002');
      return null;
    },
    readNode: (r) => node(r.uid),
    readProp: (r, name) => (name === 'html' ? seed(r.uid) : undefined),
    listChildren: () => [],
    getFields: () => [],
    applyEdit
  };
  return { adapter, applyEdit };
}

describe('RippleInlineEditor — delegates to the pluggable InlineEditor slot (EP-3)', () => {
  it('mounts the lane editor and routes onCommit -> applyEdit(setText), onCancel -> no-op', async () => {
    const { editor: fake, mounts } = makeFakeInlineEditor();
    registerInlineEditor('squire', fake); // EP-4 does exactly this with a real impl
    const stage = makeStage('<div id="n_prose001"><p>A</p></div>');
    const prose = stage.querySelector('#n_prose001') as HTMLElement;
    const { adapter, applyEdit } = richSpyAdapter();

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(prose);
    // The slot was mounted once, seeded with the html read through the port.
    expect(mounts).toHaveLength(1);
    expect(mounts[0].content).toBe('<p>A</p>');

    // onCommit routes straight to applyEdit({kind:'setText'}) with the edited value.
    mounts[0].onCommit('<p>Edited</p>');
    expect(applyEdit).toHaveBeenCalledWith(ref('n_prose001'), {
      kind: 'setText',
      html: '<p>Edited</p>'
    });

    // onCancel applies no op.
    applyEdit.mockClear();
    mounts[0].onCancel();
    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('destroys the active slot on re-entry (double-click a different node)', async () => {
    const { editor: fake, getDestroys } = makeFakeInlineEditor();
    registerInlineEditor('squire', fake);
    const stage = makeStage('<div id="n_prose001"><p>A</p></div><div id="n_prose002"><p>B</p></div>');
    const a = stage.querySelector('#n_prose001') as HTMLElement;
    const b = stage.querySelector('#n_prose002') as HTMLElement;
    const { adapter } = richSpyAdapter();

    render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(a);
    expect(getDestroys()).toBe(0);
    await fireEvent.dblClick(b); // re-entry on a different node tears the first down
    expect(getDestroys()).toBe(1);
  });

  it('destroys the active slot on unmount', async () => {
    const { editor: fake, getDestroys } = makeFakeInlineEditor();
    registerInlineEditor('squire', fake);
    const stage = makeStage('<div id="n_prose001"><p>A</p></div>');
    const prose = stage.querySelector('#n_prose001') as HTMLElement;
    const { adapter } = richSpyAdapter();

    const { unmount } = render(InlineEditor, { props: { adapter, container: stage } });
    await tick();

    await fireEvent.dblClick(prose);
    expect(getDestroys()).toBe(0);
    unmount();
    expect(getDestroys()).toBe(1);
  });
});
