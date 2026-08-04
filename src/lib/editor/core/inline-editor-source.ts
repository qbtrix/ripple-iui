/**
 * @file editor/core/inline-editor-source.ts
 * @description L1 (PURE TS / DOM, zero Svelte/rune imports) the SOURCE-FIDELITY
 *   `InlineEditor` impl (EP-4) — a no-dependency, in-place contenteditable editor
 *   registered under the 'overlay' kind. It is the rich slot for the future svelte
 *   SOURCE lane (EP-6), which edits hand-authored .svelte / html markup where a
 *   parser/schema round-trip is DESTRUCTIVE.
 *
 *   WHY NOT TIPTAP / SQUIRE (the EP-4 spike decision — see the design doc's open
 *   question). TipTap parses HTML into a ProseMirror schema and re-serializes on
 *   `getHTML()`, so it reorders/drops attributes and rewrites whitespace + non-schema
 *   markup. Squire (the prior-art candidate) was spiked and REJECTED on the decisive
 *   fidelity criterion: even with a passthrough sanitizer it rewrites inline tags
 *   (`<strong>` -> `<b>`) and its `setHTML` requires a second dependency (DOMPurify),
 *   so it is no more source-stable than TipTap and adds ~60KB + a jsdom-hostile
 *   construction path. This editor instead keeps the LIVE DOM as the source of truth:
 *   it never re-parses or re-serializes through a schema, so attribute order, child
 *   markup, and whitespace stay BYTE-STABLE — only the text node the user actually
 *   edits changes. The 'overlay' kind name is the lane key the svelte lane will set
 *   as `adapter.inlineEditor`; the no-dep win can later grow a floating visual layer
 *   (a clone-based overlay) WITHOUT changing this contract or the byte-stability
 *   guarantee.
 *
 *   MECHANISM. `mount` snapshots the element's current `innerHTML` (the authoritative
 *   seed — `opts.content` is accepted but the LIVE element wins, because re-parsing a
 *   passed-in string would itself be a normalizing round-trip), marks the element
 *   contenteditable, and places the caret at the end (NOT select-all — that would nuke
 *   child markup like `<strong>`). The user edits text in place; contenteditable
 *   mutates only the touched text node(s), leaving every other DOM node identical.
 *
 *   COMMIT / CANCEL. Enter (no shift) and blur commit; Escape cancels. A commit FIRST
 *   strips the editor scaffolding (`contenteditable` + the host's `data-ripple-editing`)
 *   so they never leak into the serialization, then reads `el.outerHTML` — the full,
 *   byte-stable element markup — and fires `onCommit(value)` ONLY when the content
 *   changed from the seed. Cancel and the silent `destroy` restore the seed `innerHTML`
 *   (the model was never mutated). EVERY teardown path clears `data-ripple-editing`
 *   (the EP-1 stuck-outline fix). `destroy` is idempotent. All focus / Selection calls
 *   are guarded so the jsdom unit path never throws.
 *
 *   XSS POSTURE — DELIBERATELY NOT SANITIZED (unlike the TipTap impl). The sibling
 *   `inline-editor-tiptap` sanitizes its seed because that seed is the RAW SPEC PROP:
 *   model content that was never rendered, so writing it to `innerHTML` grants the
 *   page a capability it did not have. This impl is the opposite case — its seed is
 *   `el.innerHTML`, a snapshot of the LIVE element. Whatever is in there was already
 *   parsed and rendered by the host (in the ripple lane, by RichTextDisplay, which
 *   sanitizes before `{@html}`), so restoring it re-creates the status quo and grants
 *   nothing new. Running the seed through `sanitizeHtml` here would therefore add no
 *   security while DESTROYING the contract this file exists for: the sanitizer's
 *   profile FORBIDS `style` and drops non-schema markup, so hand-authored source in
 *   the EP-6 svelte lane would silently lose legitimate attributes on every cancel —
 *   the exact round-trip damage that got TipTap and Squire rejected above. The
 *   invariant is "faithful to what the host rendered", and the host owns sanitizing
 *   what it renders. If a future lane ever renders UNSANITIZED model HTML into the
 *   element this mounts on, that lane's RENDER path is the bug, not this restore.
 *   Guarded by a test in `editor/inline-editor.security.test.ts`.
 *
 *   REAL-BROWSER NOTE. Native contenteditable can inject `<br>` / normalize whitespace
 *   on certain edits; that is a browser concern (not exercised by the jsdom suite). If
 *   EP-6 sees spurious diffs in a live browser, add a normalization guard at the lane's
 *   `applyEdit` seam — the byte-stability contract proven here stays unchanged.
 * @created 2026-06-30 (EP-4 — source-fidelity inline editor)
 */
import { registerInlineEditor } from './inline-editor.js';
import type { InlineEditor, InlineEditorHandle, InlineEditorMountOpts } from './inline-editor.js';

/** Collapse the caret to the end of `el`'s content. Guarded — jsdom Selection is partial. */
function caretToEnd(el: HTMLElement): void {
  try {
    const sel = window.getSelection?.();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // to the END — preserve child markup, don't select-all
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    /* caret placement is a nicety, not required for correctness */
  }
}

/**
 * Restore the element's content to its seed markup. NOT sanitized on purpose — the
 * seed is a snapshot of this element's own live content, so this restores the status
 * quo rather than introducing model HTML, and sanitizing would break byte-stability
 * (see the XSS POSTURE section in the header). Guarded for jsdom.
 */
function restoreInner(el: HTMLElement, inner: string): void {
  try {
    el.innerHTML = inner;
  } catch {
    /* jsdom */
  }
}

/**
 * The source-fidelity rich editor — no dependency, edits the live element in place,
 * keeps its markup byte-stable. Registered as the ripple 'overlay' built-in.
 */
export const SourceFidelityInlineEditor: InlineEditor = {
  mount(el: HTMLElement, opts: InlineEditorMountOpts): InlineEditorHandle {
    // The LIVE element is the source of truth (see header) — snapshot its current
    // inner markup as the seed; `opts.content` is intentionally not re-parsed into el.
    const seedInner = el.innerHTML;
    let done = false; // re-entrancy guard: a blur after Enter must not re-commit.

    function teardownDom(): void {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      // Strip the editor scaffolding BEFORE any serialization so it never leaks into
      // the committed markup: contenteditable (ours) + data-ripple-editing (the host's,
      // the EP-1 stuck-outline fix).
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-ripple-editing');
    }

    function commit(): void {
      if (done) return;
      done = true;
      teardownDom();
      // outerHTML AFTER teardown = the clean, byte-stable whole-element markup.
      const value = el.outerHTML;
      // Compare INNER markup (text edits live inside el; attrs can't change via typing).
      if (el.innerHTML !== seedInner) opts.onCommit(value);
      // No restore: the live DOM already holds the result, and the host re-renders
      // from the model after applyEdit (matches the other impls).
    }

    function cancel(): void {
      if (done) return;
      done = true;
      teardownDom();
      // The model was never mutated, so restore the live DOM to the seed.
      restoreInner(el, seedInner);
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
    try {
      el.focus();
    } catch {
      /* jsdom — focus is a nicety */
    }
    caretToEnd(el);

    return {
      destroy() {
        if (done) return; // already committed / cancelled / torn down (idempotent)
        done = true;
        teardownDom();
        // Silent teardown (no onCommit / onCancel): the model was never mutated, so
        // restore the seed markup to keep the live DOM consistent with the model.
        restoreInner(el, seedInner);
      },
      focus() {
        try {
          el.focus();
        } catch {
          /* jsdom */
        }
        caretToEnd(el);
      }
    };
  }
};

// Self-register the ripple source-fidelity built-in so `resolveInlineEditor('overlay')`
// works for the svelte lane (EP-6), which sets `adapter.inlineEditor = 'overlay'`.
registerInlineEditor('overlay', SourceFidelityInlineEditor);
