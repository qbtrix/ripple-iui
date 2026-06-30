<!--
  @file editor/RippleInlineEditor.svelte
  @description L2 (Svelte) INLINE EDIT controller for the Ripple visual editor.
    A headless controller (renders no chrome, only a `:global` editing-outline
    style): it delegates ONE `dblclick` listener on the render `container`,
    resolves the target to a node id (the same L1 `resolveElementToNodeId`
    SELECT-PARENT walk the overlay uses), and opens an in-place editor on it.

    TWO edit paths, picked by the L1 editable policy:
      • PLAIN TEXT (`isInlineTextWidget`) — heading / text / badge / button:
        the element is made `contenteditable`; Enter / blur harvest textContent
        and commit ONE `node_prop_set` (the widget's primary text prop). Escape
        restores. (Unchanged from SP-1b.)
      • RICH HTML (`isRichTextWidget`) — `richtext`: a TipTap StarterKit editor is
        dynamically imported and mounted ON the resolved element, seeded from
        `node.props.html`. Enter (no shift) / blur commit `editor.getHTML()` as a
        `node_prop_set` on the `html` prop; Escape cancels with no op. Shift+Enter
        is a hard break. Both commit + cancel tear the editor down and restore the
        host's rendered HTML (Svelte's `is_controlled` `{@html}` repaints via
        innerHTML on a changed value; we set it explicitly for the unchanged case
        and to close the async gap).

    Both paths emit through the shared `EditorOps` seam, so the canvas repaints
    reactively (SP-0 §3) and SP-1c persistence intercepts the same op stream via
    `EditorOps.onApplied`.

    SCOPE: inline text + rich HTML of single-content widgets. Multi-text /
    composite widgets are edited via the inspector's per-prop fields. Interaction
    FEEL (caret, select-all, IME, TipTap focus, rich keymaps) needs BROWSER
    confirmation — jsdom can't validate it; all DOM/Selection/TipTap calls are
    guarded so the jsdom unit path never throws.
  @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
  @changes 2026-06-30 (editor chrome PIECE 1): added the TipTap RICH-HTML path for
    `richtext` widgets alongside the existing contenteditable text path; session
    bookkeeping is now a discriminated union (text | rich).
-->
<script lang="ts">
  import type { UINode } from '../schema/ui-spec.js';
  import { resolveElementToNodeId, findNodeElement } from './core/bounds-index.js';
  import {
    isInlineTextWidget,
    isRichTextWidget,
    primaryTextProp,
    normalizeInlineText,
    RICH_TEXT_PROP
  } from './core/editable.js';
  import type { EditorOps } from './core/editor-ops.js';
  import { EditorSelection } from './editor-selection.svelte.js';

  interface Props {
    /** Element wrapping the mounted <Ripple> whose nodes are edited. */
    container?: HTMLElement | null;
    /** Shared selection store — double-click also selects the targeted node. */
    selection?: EditorSelection;
    /** Resolve a node id to its spec node (type + props for the rich seed). */
    getNode: (id: string) => UINode | null | undefined;
    /** The one-op seam (shared with the inspector) — commit emits node_prop_set. */
    ops: EditorOps;
    /** Node ids known from the spec — the precise id allow-list for resolution. */
    knownIds?: Set<string> | null;
    /** When false, double-click does nothing (preview mode). */
    enabled?: boolean;
    /** Fired when an element enters edit mode. */
    onbeginedit?: (id: string) => void;
    /** Fired after a commit applies an op (content actually changed). */
    oncommit?: (id: string, prop: string, value: string) => void;
    /** Fired when an edit is cancelled (Escape) — no op applied. */
    oncancel?: (id: string) => void;
  }

  let {
    container = null,
    selection = new EditorSelection(),
    getNode,
    ops,
    knownIds = null,
    enabled = true,
    onbeginedit,
    oncommit,
    oncancel
  }: Props = $props();

  // The current edit, plus what we need to commit/restore. Held OUTSIDE $state on
  // purpose: this is imperative DOM-edit bookkeeping, not render state — the
  // visible result comes from the op -> reactive re-render. A discriminated union
  // so the two paths never cross-contaminate.
  interface TextSession {
    kind: 'text';
    el: HTMLElement;
    id: string;
    prop: string;
    original: string;
    onKey: (e: KeyboardEvent) => void;
    onBlur: () => void;
  }
  interface RichSession {
    kind: 'rich';
    el: HTMLElement;
    id: string;
    original: string;
    editor: unknown; // TipTap Editor once mounted (typed `any` at the call sites)
    disposed: boolean; // guards the async TipTap import against a teardown race
  }
  type Session = TextSession | RichSession;
  let session: Session | null = null;

  function selectAll(el: HTMLElement): void {
    // Place the caret across the whole text so typing replaces it. Guarded —
    // jsdom's Selection support is partial and must never throw the edit path.
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

  function teardownTextDom(s: TextSession): void {
    s.el.removeEventListener('keydown', s.onKey);
    s.el.removeEventListener('blur', s.onBlur);
    s.el.removeAttribute('contenteditable');
    s.el.removeAttribute('data-ripple-editing');
  }

  function safeDestroy(editor: unknown): void {
    try {
      (editor as { destroy?: () => void } | null)?.destroy?.();
    } catch {
      /* jsdom / double-destroy — teardown must never throw */
    }
  }

  // After TipTap is torn down the element is empty. Svelte's `is_controlled`
  // `{@html}` only repaints when the `html` STRING changes, so write the current
  // model HTML in directly — covers the unchanged-value case AND the async gap
  // before Svelte flushes a changed value. Guarded for jsdom.
  function restoreRichHtml(el: HTMLElement, html: string): void {
    try {
      el.innerHTML = html;
    } catch {
      /* jsdom */
    }
  }

  function commit(): void {
    const s = session;
    if (!s) return;
    session = null; // re-entrancy guard: teardown / destroy may fire blur.
    if (s.kind === 'text') {
      const value = normalizeInlineText(s.el.textContent);
      teardownTextDom(s);
      // Only emit when the text actually changed — keeps the op/undo stream clean.
      if (value !== normalizeInlineText(s.original)) {
        const applied = ops.setNodeProp(s.id, s.prop, value);
        if (applied) oncommit?.(s.id, s.prop, value);
      }
      // The reactive re-render rewrites the element's text from the new prop.
      return;
    }
    // rich
    s.disposed = true;
    let html = s.original;
    try {
      html = (s.editor as { getHTML?: () => string } | null)?.getHTML?.() ?? s.original;
    } catch {
      html = s.original;
    }
    safeDestroy(s.editor);
    s.el.removeAttribute('data-ripple-editing'); // clear the editing outline (text path does this in teardownTextDom)
    const changed = html !== s.original;
    if (changed) {
      const applied = ops.setNodeProp(s.id, RICH_TEXT_PROP, html);
      if (applied) oncommit?.(s.id, RICH_TEXT_PROP, html);
    }
    restoreRichHtml(s.el, changed ? html : s.original);
  }

  function cancel(): void {
    const s = session;
    if (!s) return;
    session = null;
    if (s.kind === 'text') {
      teardownTextDom(s);
      // The spec was never mutated, so restoring the DOM text matches the model.
      s.el.textContent = s.original;
      oncancel?.(s.id);
      return;
    }
    // rich
    s.disposed = true;
    safeDestroy(s.editor);
    s.el.removeAttribute('data-ripple-editing'); // clear the editing outline (text path does this in teardownTextDom)
    restoreRichHtml(s.el, s.original);
    oncancel?.(s.id);
  }

  function beginEdit(el: HTMLElement, id: string, prop: string): void {
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

    session = { kind: 'text', el, id, prop, original: el.textContent ?? '', onKey, onBlur };
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-ripple-editing', id);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
    el.focus();
    selectAll(el);
    onbeginedit?.(id);
  }

  async function beginRichEdit(el: HTMLElement, id: string, node: UINode): Promise<void> {
    const raw = node.props?.[RICH_TEXT_PROP];
    const original = typeof raw === 'string' ? raw : '';

    // Set the session synchronously so a re-entrant dblclick is ignored while the
    // editor module loads. `editor` is filled in once TipTap resolves.
    const s: RichSession = { kind: 'rich', el, id, original, editor: null, disposed: false };
    session = s;
    el.setAttribute('data-ripple-editing', id);
    onbeginedit?.(id);

    try {
      const [{ Editor }, { default: StarterKit }] = await Promise.all([
        import('@tiptap/core'),
        import('@tiptap/starter-kit')
      ]);
      if (s.disposed || session !== s) return; // torn down mid-import

      // Clear the host's {@html} render so TipTap (which APPENDS its view to the
      // element) doesn't double-render. Safe: Svelte's `is_controlled` {@html}
      // repaints via innerHTML on the next `html` change, and commit/cancel
      // restore it explicitly.
      try {
        el.innerHTML = '';
      } catch {
        /* jsdom */
      }

      const editor = new Editor({
        element: el,
        extensions: [StarterKit],
        content: original || '',
        editorProps: {
          attributes: { class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none' },
          // Intercept commit/cancel keys BEFORE ProseMirror's default handling.
          // Defer the actual commit/cancel to a microtask so we never destroy the
          // editor view from inside its own keydown handler. Enter (no shift)
          // commits — mirrors the text path; Shift+Enter falls through to a hard
          // break. Richer multiline-via-Enter is a follow-up.
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

      if (s.disposed || session !== s) {
        // Torn down while constructing — drop the just-created editor.
        safeDestroy(editor);
        return;
      }
      s.editor = editor;
      try {
        editor.commands.focus('end');
      } catch {
        /* jsdom — focus/selection is a nicety */
      }
    } catch {
      // Module load / mount failed — restore the rendered HTML and clear session.
      if (session === s) {
        session = null;
        el.removeAttribute('data-ripple-editing');
        restoreRichHtml(el, original);
      }
    }
  }

  $effect(() => {
    const root = container;
    void knownIds;
    if (!root || !enabled) return;

    const onDblClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Ignore double-clicks inside the element we're already editing.
      if (session && target && session.el.contains(target)) return;

      const id = resolveElementToNodeId(target, { knownIds, boundary: root });
      if (!id) return;
      // A fresh double-click on a different node commits the previous edit first.
      if (session && session.id !== id) commit();

      selection.select(id);
      const node = getNode(id);
      if (!node) return;
      const el = findNodeElement(root, id, { knownIds });
      if (!el) return; // non-id-forwarding widget — inspector handles it

      if (isRichTextWidget(node.type)) {
        e.preventDefault();
        void beginRichEdit(el, id, node);
        return;
      }

      if (!isInlineTextWidget(node.type)) return; // inspector handles the rest
      const prop = primaryTextProp(node.type);
      if (!prop) return;

      e.preventDefault();
      beginEdit(el, id, prop);
    };

    root.addEventListener('dblclick', onDblClick);
    return () => {
      root.removeEventListener('dblclick', onDblClick);
      if (session) {
        if (session.kind === 'text') {
          teardownTextDom(session);
        } else {
          session.disposed = true;
          safeDestroy(session.editor);
          session.el.removeAttribute('data-ripple-editing');
          restoreRichHtml(session.el, session.original);
        }
      }
      session = null;
    };
  });
</script>

<style>
  /* The edited element lives in the host's <Ripple> render (outside this
     component's scope), so the editing affordance must be global. */
  :global([data-ripple-editing]) {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
    border-radius: 2px;
    cursor: text;
    caret-color: #6366f1;
  }
</style>
