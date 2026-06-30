/**
 * @file editor/core/inline-editor-contenteditable.ts
 * @description L1 (PURE TS / DOM, zero Svelte/rune imports) the PLAIN single-text
 *   `InlineEditor` impl (EP-3) — the contenteditable path lifted VERBATIM out of
 *   `RippleInlineEditor.svelte`. Used for heading / text / button / badge, whose
 *   rendered textContent equals their primary text prop, so the edit round-trips
 *   `textContent` -> the prop.
 *
 *   LIFECYCLE (per the `InlineEditor` slot contract): `mount` makes `el`
 *   contenteditable, wires Enter (commit) / Escape (cancel) / blur (commit), focuses
 *   it and selects all so typing replaces. A commit harvests `normalizeInlineText
 *   (textContent)` and fires `onCommit(value)` ONLY when it differs from the seed
 *   (an unchanged Enter / blur emits nothing — the pre-EP-3 behavior). Escape
 *   restores the seed text and fires `onCancel`. `destroy` tears the DOM down
 *   silently. EVERY teardown path removes the host's `data-ripple-editing`
 *   attribute and the contenteditable listeners + flag. Interaction FEEL (caret,
 *   IME, select-all) is out of jsdom's reach; all Selection calls are guarded.
 * @created 2026-06-30 (EP-3 — pluggable InlineEditor slot)
 */
import { normalizeInlineText } from './editable.js';
import type { InlineEditor, InlineEditorHandle, InlineEditorMountOpts } from './inline-editor.js';

/** Caret across the whole text so typing replaces it. Guarded — jsdom Selection is partial. */
function selectAll(el: HTMLElement): void {
  try {
    const sel = window.getSelection?.();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    /* selection is a nicety, not required for correctness */
  }
}

/** The plain single-text contenteditable editor — the fixed path for text widgets. */
export const ContentEditableInlineEditor: InlineEditor = {
  mount(el: HTMLElement, opts: InlineEditorMountOpts): InlineEditorHandle {
    const seed = opts.content;
    let done = false; // re-entrancy guard: a blur after Enter must not re-commit.

    function teardownDom(): void {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-ripple-editing'); // clear the editing outline (the EP-1 fix)
    }

    function commit(): void {
      if (done) return;
      done = true;
      const value = normalizeInlineText(el.textContent);
      teardownDom();
      // Only emit when the text actually changed — keeps the op / undo stream clean.
      // (No DOM restore: the host's reactive re-render rewrites the text from the prop.)
      if (value !== normalizeInlineText(seed)) opts.onCommit(value);
    }

    function cancel(): void {
      if (done) return;
      done = true;
      teardownDom();
      // The model was never mutated, so restoring the DOM text matches it.
      el.textContent = seed;
      opts.onCancel();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    const onBlur = () => commit();

    el.setAttribute('contenteditable', 'true');
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
    el.focus();
    selectAll(el);

    return {
      destroy() {
        if (done) return; // already committed / cancelled / torn down
        done = true;
        teardownDom();
      },
      focus() {
        el.focus();
        selectAll(el);
      }
    };
  }
};
