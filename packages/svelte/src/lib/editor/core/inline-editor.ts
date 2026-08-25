/**
 * @file editor/core/inline-editor.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) the pluggable INLINE-EDITOR
 *   slot contract (EP-3) + a tiny kind -> editor registry. The visual-editor chrome
 *   (`RippleInlineEditor`) no longer hard-codes TipTap / contenteditable: on
 *   double-click it picks an `InlineEditor` and `mount`s it on the resolved element,
 *   so a future lane (svelte source, html/css) can supply its own source-fidelity
 *   editor by registering one under its `adapter.inlineEditor` kind — WITHOUT
 *   touching the controller.
 *
 *   SLOT CONTRACT. The host (the controller) marks the element being edited with
 *   `data-ripple-editing` (the editing outline) BEFORE it calls `mount`, and seeds
 *   the editor via `opts.content` (html for a rich widget, text for a single-text
 *   one). The InlineEditor then OWNS its full lifecycle:
 *     • wires its own Enter / Escape / blur (commit / cancel / commit, matching the
 *       ripple feel), focus + select-on-open, and teardown;
 *     • calls `opts.onCommit(value)` ONLY when the content actually changed from
 *       the seed (so an unchanged commit emits no op) — `value` is the edited
 *       content (html or text); the host routes it to `adapter.applyEdit(ref,
 *       { kind: 'setText', html: value })`;
 *     • calls `opts.onCancel()` on Escape (the host applies no op);
 *     • on EVERY teardown path (commit, cancel, and `handle.destroy()`) MUST clear
 *       the host's `data-ripple-editing` attribute — this is the EP-1 stuck-outline
 *       fix (the rich commit branch used to leak the indigo outline); keep it.
 *   `handle.destroy()` is the SILENT teardown the host calls on re-entry (a fresh
 *   edit on another node) and on unmount: tear down with NO `onCommit` / `onCancel`.
 *   It must be idempotent and safe to call before an async editor has mounted.
 *
 *   THE PLAIN PATH IS FIXED. Single-text widgets (heading / text / button / badge)
 *   always use `ContentEditableInlineEditor`; only the RICH slot is pluggable, keyed
 *   by `adapter.inlineEditor` ('tiptap' is the ripple built-in; 'squire' / 'overlay'
 *   are reserved for EP-4's source-fidelity lane, which calls `registerInlineEditor`
 *   from its own module).
 * @created 2026-06-30 (EP-3 — pluggable InlineEditor slot)
 */

/** What the host hands an `InlineEditor` when it opens an in-place edit. */
export interface InlineEditorMountOpts {
  /** Seed content for the editor: rich HTML for a rich widget, text for a plain one. */
  content: string;
  /** Called on a CHANGED commit (Enter / blur); `value` is the edited content. */
  onCommit: (value: string) => void;
  /** Called on cancel (Escape); the host applies no op. */
  onCancel: () => void;
}

/** Live handle to a mounted `InlineEditor`. */
export interface InlineEditorHandle {
  /**
   * Silent teardown — NO `onCommit` / `onCancel`. The host calls this on re-entry
   * (a new edit elsewhere) and on unmount. Must be idempotent and safe to call
   * before an async editor has finished mounting; must clear `data-ripple-editing`.
   */
  destroy(): void;
  /** Optional: (re)focus the editor. The host relies on `mount` auto-focusing. */
  focus?(): void;
}

/**
 * A pluggable in-place editor. `mount` SYNCHRONOUSLY returns a handle even when the
 * underlying editor loads asynchronously (e.g. TipTap's dynamic import), so the host
 * can tear it down (`handle.destroy()`) during the load.
 */
export interface InlineEditor {
  mount(el: HTMLElement, opts: InlineEditorMountOpts): InlineEditorHandle;
}

// --------------------------------------------------------------------------
// RICH-editor registry — maps a lane's `adapter.inlineEditor` kind to its impl.
// The plain single-text path is NOT in here (it always uses ContentEditable).
// --------------------------------------------------------------------------

const RICH_EDITORS = new Map<string, InlineEditor>();

/**
 * Register the rich/whole-content inline editor for a lane kind (the value a lane's
 * `adapter.inlineEditor` returns). EP-4 calls this from the svelte lane's setup
 * (`registerInlineEditor('squire', SquireInlineEditor)`) so the controller resolves
 * it without changing. Re-registering a kind overwrites the previous impl.
 */
export function registerInlineEditor(kind: string, editor: InlineEditor): void {
  RICH_EDITORS.set(kind, editor);
}

/** The rich editor registered for `kind`, or null when none is registered. */
export function resolveInlineEditor(kind: string): InlineEditor | null {
  return RICH_EDITORS.get(kind) ?? null;
}
