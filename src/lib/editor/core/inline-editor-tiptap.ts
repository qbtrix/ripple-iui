/**
 * @file editor/core/inline-editor-tiptap.ts
 * @description L1 (PURE TS / DOM, zero Svelte/rune imports) the RICH-HTML
 *   `InlineEditor` impl (EP-3) — the TipTap StarterKit path lifted VERBATIM out of
 *   `RippleInlineEditor.svelte`. The ripple built-in rich editor (registered under
 *   the 'tiptap' kind); used for `richtext`, whose content is structural HTML.
 *
 *   ASYNC MOUNT. `mount` returns its handle SYNCHRONOUSLY and dynamically imports
 *   `@tiptap/core` + `@tiptap/starter-kit` in the background, so the bundle stays
 *   lean and the host can tear down (`handle.destroy()`) mid-load. A `disposed`
 *   flag guards the import against a teardown race (checked before clearing the
 *   host HTML and again after constructing the editor).
 *
 *   COMMIT / CANCEL. Enter (no shift) and blur commit `editor.getHTML()`; Escape
 *   cancels. Both are deferred to a microtask so the editor view is never destroyed
 *   from inside its own keydown handler. A commit fires `onCommit(html)` ONLY when
 *   the HTML changed from the seed. After TipTap is torn down the element is empty,
 *   and Svelte's `is_controlled` `{@html}` only repaints on a CHANGED html string,
 *   so every teardown path writes the current HTML back into the element directly
 *   (covers the unchanged-value case AND the async gap before Svelte flushes). EVERY
 *   teardown path also clears the host's `data-ripple-editing` attribute — the EP-1
 *   stuck-outline fix (the rich commit branch used to leak the indigo outline).
 *   All DOM / TipTap calls are guarded so the jsdom unit path never throws.
 *
 *   XSS POSTURE. The seed is SPEC content — LLM-authored and prompt-injectable —
 *   and every teardown path writes it to `el.innerHTML` on a LIVE element, which
 *   bypasses ProseMirror's schema completely. (The MOUNT path does not: ProseMirror
 *   parses in an inert document and StarterKit has no image node, so a payload dies
 *   there. Only the teardown restore was exploitable.) So the seed is sanitized on
 *   intake, the `restoreRichHtml` sink sanitizes again defensively, and the COMMITTED
 *   value is sanitized so the editor can never launder script-capable HTML back into
 *   the spec for the next reader. Sanitizing the seed on intake (rather than at each
 *   write) also keeps the `changed` comparison clean-vs-clean, so an unchanged commit
 *   still emits no op. Structural StarterKit markup is untouched by the profile.
 * @created 2026-06-30 (EP-3 — pluggable InlineEditor slot)
 * @changes 2026-08-04 (security): closed the raw-`innerHTML` XSS sink — sanitize the
 *   seed on intake, inside `restoreRichHtml`, and on the committed value.
 */
import { sanitizeHtml } from '../../utils/sanitize-html.js';
import { registerInlineEditor } from './inline-editor.js';
import type { InlineEditor, InlineEditorHandle, InlineEditorMountOpts } from './inline-editor.js';

/** Best-effort destroy — jsdom / double-destroy must never throw the teardown path. */
function safeDestroy(editor: unknown): void {
  try {
    (editor as { destroy?: () => void } | null)?.destroy?.();
  } catch {
    /* jsdom / double-destroy — teardown must never throw */
  }
}

/**
 * Write model HTML into the element (Svelte won't repaint an unchanged {@html}).
 * This is a RAW innerHTML write on a live, in-document element, so it sanitizes at
 * the sink — the callers already pass sanitized strings, but hardening the write
 * itself keeps any future call site safe by construction. Guarded for jsdom.
 */
function restoreRichHtml(el: HTMLElement, html: string): void {
  try {
    el.innerHTML = sanitizeHtml(html);
  } catch {
    /* jsdom */
  }
}

/** The rich-HTML editor backed by TipTap StarterKit — the ripple 'tiptap' built-in. */
export const TipTapInlineEditor: InlineEditor = {
  mount(el: HTMLElement, opts: InlineEditorMountOpts): InlineEditorHandle {
    // Sanitize the SPEC-controlled seed once, here: every teardown path writes it
    // straight to innerHTML, and `changed` is measured against it (see header).
    const seed = sanitizeHtml(opts.content);
    let editor: unknown = null; // TipTap Editor once mounted (typed `any` at the call sites)
    let disposed = false; // guards the async TipTap import against a teardown race

    function commit(): void {
      if (disposed) return;
      disposed = true;
      let html = seed;
      try {
        html = (editor as { getHTML?: () => string } | null)?.getHTML?.() ?? seed;
      } catch {
        html = seed;
      }
      // The value about to be written back into the SPEC — sanitize so a committed
      // edit can never re-poison the node for every future reader of that spec.
      html = sanitizeHtml(html);
      safeDestroy(editor);
      el.removeAttribute('data-ripple-editing'); // clear the editing outline (the EP-1 fix)
      const changed = html !== seed;
      if (changed) opts.onCommit(html); // the host writes through adapter.applyEdit(setText)
      restoreRichHtml(el, changed ? html : seed);
    }

    function cancel(): void {
      if (disposed) return;
      disposed = true;
      safeDestroy(editor);
      el.removeAttribute('data-ripple-editing');
      restoreRichHtml(el, seed);
      opts.onCancel();
    }

    // Kick off the editor mount asynchronously; the handle below is returned now.
    void (async () => {
      try {
        const [{ Editor }, { default: StarterKit }] = await Promise.all([
          import('@tiptap/core'),
          import('@tiptap/starter-kit')
        ]);
        if (disposed) return; // torn down mid-import

        // Clear the host's {@html} render so TipTap (which APPENDS its view to the
        // element) doesn't double-render. Safe: Svelte repaints {@html} on the next
        // `html` change, and commit / cancel restore it explicitly.
        try {
          el.innerHTML = '';
        } catch {
          /* jsdom */
        }

        const ed = new Editor({
          element: el,
          extensions: [StarterKit],
          content: seed || '',
          editorProps: {
            attributes: { class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none' },
            // Intercept commit / cancel keys BEFORE ProseMirror's default handling.
            // Defer to a microtask so the editor view is never destroyed from inside
            // its own keydown handler. Enter (no shift) commits — mirrors the text
            // path; Shift+Enter falls through to a hard break.
            handleKeyDown: (_view, event: KeyboardEvent) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                queueMicrotask(commit);
                return true;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                queueMicrotask(cancel);
                return true;
              }
              return false;
            }
          },
          // Blur commits (same intent as the text path). Deferred for the same
          // mid-handler-destroy safety reason as the keys above.
          onBlur: () => queueMicrotask(commit)
        });

        if (disposed) {
          // Torn down while constructing — drop the just-created editor.
          safeDestroy(ed);
          return;
        }
        editor = ed;
        try {
          ed.commands.focus('end');
        } catch {
          /* jsdom — focus / selection is a nicety */
        }
      } catch {
        // Module load / mount failed — restore the rendered HTML and clear the slot.
        if (!disposed) {
          disposed = true;
          el.removeAttribute('data-ripple-editing');
          restoreRichHtml(el, seed);
        }
      }
    })();

    return {
      destroy() {
        if (disposed) return; // already committed / cancelled / torn down (idempotent)
        disposed = true;
        safeDestroy(editor);
        el.removeAttribute('data-ripple-editing');
        restoreRichHtml(el, seed);
      },
      focus() {
        try {
          (editor as { commands?: { focus?: (pos: string) => void } } | null)?.commands?.focus?.('end');
        } catch {
          /* jsdom */
        }
      }
    };
  }
};

// Self-register the ripple built-in so `resolveInlineEditor('tiptap')` works for any
// external caller; the controller also references the impl directly for the default.
registerInlineEditor('tiptap', TipTapInlineEditor);
