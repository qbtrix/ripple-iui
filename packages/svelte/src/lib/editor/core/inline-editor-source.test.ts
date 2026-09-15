// editor/core/inline-editor-source.test.ts
// @description EP-4 unit tests for the SOURCE-FIDELITY InlineEditor (the no-dep,
//   in-place contenteditable impl registered under 'overlay'). The centerpiece is
//   the FIDELITY proof: editing the visible text of a hand-authored element must
//   leave its markup BYTE-STABLE — attribute names AND order, untouched child
//   markup, and whitespace — changing only the text node the user touched. This is
//   the exact round-trip TipTap/Squire fail (they re-serialize through a schema /
//   sanitizer: drop attrs, rewrite <strong>-><b>); proving it here is the reason
//   EP-4 exists. Plus the InlineEditor slot-contract coverage (mount -> edit ->
//   onCommit(value) -> destroy), the unchanged-commit no-op, Escape/cancel restore,
//   silent + idempotent destroy, blur-commit, and self-registration under 'overlay'.
// @created 2026-06-30 (EP-4 — source-fidelity inline editor)
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SourceFidelityInlineEditor } from './inline-editor-source.js';
import { resolveInlineEditor } from './inline-editor.js';

// The representative hand-authored element: two attributes in a specific order, a
// leading text node, and untouched child markup with a significant space.
const REP = '<p class="lead" data-x="y">Hello <strong>world</strong></p>';
const REP_EDITED = '<p class="lead" data-x="y">Hi <strong>world</strong></p>';

/** Mount REP into the live document and stamp it as the host does (data-ripple-editing). */
function mountRep(): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = REP;
  const el = host.firstElementChild as HTMLElement;
  el.setAttribute('data-ripple-editing', 'node-1'); // the host sets this BEFORE mount
  document.body.appendChild(host);
  return el;
}

/** Simulate a native contenteditable text edit: replace text inside the FIRST text
 *  node (what a browser does when the user selects "Hello" and types "Hi"). */
function editFirstText(el: HTMLElement, next: string): void {
  const textNode = el.firstChild as Text; // "Hello "
  textNode.data = next;
}

const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
const escape = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });

let el: HTMLElement;
beforeEach(() => {
  el = mountRep();
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('source-fidelity editor — markup byte-stability (the decisive criterion)', () => {
  it('editing "Hello"->"Hi" keeps attributes (and ORDER), child markup, and whitespace byte-stable', () => {
    const onCommit = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel: vi.fn() });

    // Sanity: seed is exactly the authored markup (the editor did not touch it on mount).
    expect(el.innerHTML).toBe('Hello <strong>world</strong>');

    editFirstText(el, 'Hi '); // keep the trailing space the author wrote
    el.dispatchEvent(enter());

    // onCommit gets the FULL element markup, byte-identical except the edited text.
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(REP_EDITED);

    // The live DOM is equally byte-stable (string equality also proves attr ORDER).
    expect(el.outerHTML).toBe(REP_EDITED);
  });

  it('strips the editor scaffolding (contenteditable + data-ripple-editing) from the committed markup', () => {
    const onCommit = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel: vi.fn() });

    editFirstText(el, 'Hi ');
    el.dispatchEvent(enter());

    const value = onCommit.mock.calls[0][0] as string;
    expect(value).not.toContain('contenteditable');
    expect(value).not.toContain('data-ripple-editing');
    expect(el.hasAttribute('data-ripple-editing')).toBe(false); // EP-1 stuck-outline fix
    expect(el.hasAttribute('contenteditable')).toBe(false);
  });

  it('does NOT select-all on open (so child markup survives a fresh edit)', () => {
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit: vi.fn(), onCancel: vi.fn() });
    // After mount the child <strong> is still present and untouched.
    expect(el.querySelector('strong')?.outerHTML).toBe('<strong>world</strong>');
  });
});

describe('source-fidelity editor — InlineEditor slot conformance', () => {
  it('mount -> edit -> onCommit(value) -> destroy round-trips per the contract', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const handle = SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel });

    expect(typeof handle.destroy).toBe('function');

    editFirstText(el, 'Hi ');
    el.dispatchEvent(enter());
    expect(onCommit).toHaveBeenCalledWith(REP_EDITED);
    expect(onCancel).not.toHaveBeenCalled();

    // destroy AFTER commit is a no-op (idempotent) and never re-fires callbacks.
    expect(() => handle.destroy()).not.toThrow();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('an unchanged commit emits NO op (keeps the undo / op stream clean)', () => {
    const onCommit = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel: vi.fn() });

    el.dispatchEvent(enter()); // committed without any edit
    expect(onCommit).not.toHaveBeenCalled();
    expect(el.hasAttribute('data-ripple-editing')).toBe(false); // still torn down cleanly
  });

  it('blur commits (same intent as Enter)', () => {
    const onCommit = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel: vi.fn() });

    editFirstText(el, 'Hi ');
    el.dispatchEvent(new FocusEvent('blur'));
    expect(onCommit).toHaveBeenCalledWith(REP_EDITED);
  });

  it('a blur AFTER an Enter commit does not re-commit (re-entrancy guard)', () => {
    const onCommit = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel: vi.fn() });

    editFirstText(el, 'Hi ');
    el.dispatchEvent(enter());
    el.dispatchEvent(new FocusEvent('blur'));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

describe('source-fidelity editor — cancel + silent teardown', () => {
  it('Escape restores the seed markup, fires onCancel, and clears data-ripple-editing', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel });

    editFirstText(el, 'Hi ');
    el.dispatchEvent(escape());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(el.innerHTML).toBe('Hello <strong>world</strong>'); // restored to seed
    expect(el.hasAttribute('data-ripple-editing')).toBe(false);
    expect(el.hasAttribute('contenteditable')).toBe(false);
  });

  it('destroy is SILENT (no onCommit / onCancel), restores the seed, and clears the outline', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const handle = SourceFidelityInlineEditor.mount(el, { content: el.innerHTML, onCommit, onCancel });

    editFirstText(el, 'Hi '); // pending, uncommitted edit
    handle.destroy();

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(el.innerHTML).toBe('Hello <strong>world</strong>'); // seed restored
    expect(el.hasAttribute('data-ripple-editing')).toBe(false);
  });

  it('destroy is idempotent (safe to call twice)', () => {
    const handle = SourceFidelityInlineEditor.mount(el, {
      content: el.innerHTML,
      onCommit: vi.fn(),
      onCancel: vi.fn()
    });
    expect(() => {
      handle.destroy();
      handle.destroy();
    }).not.toThrow();
  });
});

describe('source-fidelity editor — registry', () => {
  it('self-registers under the "overlay" kind (the svelte lane resolves it without code change)', () => {
    expect(resolveInlineEditor('overlay')).toBe(SourceFidelityInlineEditor);
  });
});
