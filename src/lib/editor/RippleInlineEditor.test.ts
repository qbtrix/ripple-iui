// editor/RippleInlineEditor.test.ts
// @description SP-1b component test for the inline text editor (jsdom). Drives a
//   real container DOM (an id-bearing element) through the dblclick -> edit ->
//   commit / cancel lifecycle and asserts: a single-text widget enters
//   contenteditable on double-click and selects the node; Enter commits exactly
//   one node_prop_set via the EditorOps seam; Escape cancels with no op and
//   restores the original text; a non-inline widget never enters edit. The
//   contenteditable INTERACTION FEEL (caret, IME, select-all) is out of jsdom's
//   reach — that is covered by the "needs browser confirmation" list, not here.
// @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UINode } from '../schema/ui-spec.js';
import InlineEditor from './RippleInlineEditor.svelte';
import { createEditorSelection } from './editor-selection.svelte.js';
import type { EditorOps } from './core/editor-ops.js';

// Build a container holding one id-bearing element and append it to the document
// (the component attaches its dblclick listener to this container, separate from
// testing-library's own render root).
function makeStage(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

function makeOps(): EditorOps & { setNodeProp: ReturnType<typeof vi.fn> } {
  return {
    apply: vi.fn(() => true),
    setNodeProp: vi.fn(() => true)
  } as EditorOps & { setNodeProp: ReturnType<typeof vi.fn> };
}

afterEach(() => {
  document.body.innerHTML = '';
});

const HEADING_NODE: UINode = { type: 'heading', id: 'n_head0001', props: { text: 'Editor Lab', level: 2 } };

describe('RippleInlineEditor — double-click to edit a single-text widget', () => {
  it('enters contenteditable, selects the node, and Enter commits one node_prop_set', async () => {
    const container = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = container.querySelector('#n_head0001') as HTMLElement;
    const selection = createEditorSelection();
    const ops = makeOps();

    render(InlineEditor, {
      props: {
        container,
        selection,
        ops,
        knownIds: new Set(['n_head0001']),
        getNode: (id: string) => (id === 'n_head0001' ? HEADING_NODE : null)
      }
    });
    await tick();

    await fireEvent.dblClick(heading);
    expect(heading.getAttribute('contenteditable')).toBe('true');
    expect(heading.getAttribute('data-ripple-editing')).toBe('n_head0001');
    expect(selection.selectedId).toBe('n_head0001');

    // Simulate the user editing the contenteditable text, then pressing Enter.
    heading.textContent = 'New Title';
    await fireEvent.keyDown(heading, { key: 'Enter' });

    expect(ops.setNodeProp).toHaveBeenCalledTimes(1);
    expect(ops.setNodeProp).toHaveBeenCalledWith('n_head0001', 'text', 'New Title');
    // Edit mode torn down after commit.
    expect(heading.hasAttribute('contenteditable')).toBe(false);
  });

  it('commits on blur', async () => {
    const container = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = container.querySelector('#n_head0001') as HTMLElement;
    const ops = makeOps();

    render(InlineEditor, {
      props: {
        container,
        ops,
        knownIds: new Set(['n_head0001']),
        getNode: () => HEADING_NODE
      }
    });
    await tick();

    await fireEvent.dblClick(heading);
    heading.textContent = 'Blurred Title';
    await fireEvent.blur(heading);

    expect(ops.setNodeProp).toHaveBeenCalledWith('n_head0001', 'text', 'Blurred Title');
  });

  it('Escape cancels — no op applied, original text restored', async () => {
    const container = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = container.querySelector('#n_head0001') as HTMLElement;
    const ops = makeOps();

    render(InlineEditor, {
      props: {
        container,
        ops,
        knownIds: new Set(['n_head0001']),
        getNode: () => HEADING_NODE
      }
    });
    await tick();

    await fireEvent.dblClick(heading);
    heading.textContent = 'Discarded';
    await fireEvent.keyDown(heading, { key: 'Escape' });

    expect(ops.setNodeProp).not.toHaveBeenCalled();
    expect(heading.textContent).toBe('Editor Lab');
    expect(heading.hasAttribute('contenteditable')).toBe(false);
  });

  it('does not emit an op when the text is unchanged', async () => {
    const container = makeStage('<h2 id="n_head0001">Editor Lab</h2>');
    const heading = container.querySelector('#n_head0001') as HTMLElement;
    const ops = makeOps();

    render(InlineEditor, {
      props: { container, ops, knownIds: new Set(['n_head0001']), getNode: () => HEADING_NODE }
    });
    await tick();

    await fireEvent.dblClick(heading);
    await fireEvent.keyDown(heading, { key: 'Enter' }); // committed without editing

    expect(ops.setNodeProp).not.toHaveBeenCalled();
  });
});

describe('RippleInlineEditor — non-inline widgets', () => {
  it('selects but does not enter edit mode for a composite widget', async () => {
    const container = makeStage('<div id="n_card0001">A card</div>');
    const card = container.querySelector('#n_card0001') as HTMLElement;
    const selection = createEditorSelection();
    const ops = makeOps();

    render(InlineEditor, {
      props: {
        container,
        selection,
        ops,
        knownIds: new Set(['n_card0001']),
        getNode: () => ({ type: 'card', id: 'n_card0001', props: { title: 'A card' } })
      }
    });
    await tick();

    await fireEvent.dblClick(card);

    expect(selection.selectedId).toBe('n_card0001'); // still selectable
    expect(card.hasAttribute('contenteditable')).toBe(false); // but not editable inline
    expect(ops.setNodeProp).not.toHaveBeenCalled();
  });
});
