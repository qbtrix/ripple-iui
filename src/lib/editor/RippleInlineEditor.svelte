<!--
  @file editor/RippleInlineEditor.svelte
  @description L2 (Svelte) INLINE TEXT EDIT for the Ripple visual editor (SP-1b).
    A headless controller (renders no chrome, only a `:global` editing-outline
    style): it delegates ONE `dblclick` listener on the render `container`,
    resolves the target to a node id (the same L1 `resolveElementToNodeId`
    SELECT-PARENT walk the overlay uses), and — if the node is an inline-safe
    single-text widget (`isInlineTextWidget`) — makes that element
    `contenteditable` in place, focused with its text selected.

    Commit (Enter or blur) harvests the element's text, normalizes it, and emits
    exactly ONE `node_prop_set` op through the shared `EditorOps` seam against the
    host's `$state` spec — so the canvas repaints reactively (SP-0 §3) and SP-1c
    persistence can intercept the same op stream via `EditorOps.onApplied`.
    Escape cancels and restores the original text.

    SCOPE (SP-1b): inline text of single-text widgets via a plain contenteditable.
    A TipTap rich-text upgrade is a deliberate FUTURE slice — not pulled in here.
    Multi-text / composite widgets are edited via the inspector's per-prop fields,
    never through textContent. Interaction FEEL (caret, select-all, IME, button
    contenteditable) needs BROWSER confirmation — jsdom can't validate it.
  @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
-->
<script lang="ts">
  import type { UINode } from '../schema/ui-spec.js';
  import { resolveElementToNodeId, findNodeElement } from './core/bounds-index.js';
  import { isInlineTextWidget, primaryTextProp, normalizeInlineText } from './core/editable.js';
  import type { EditorOps } from './core/editor-ops.js';
  import { EditorSelection } from './editor-selection.svelte.js';

  interface Props {
    /** Element wrapping the mounted <Ripple> whose nodes are edited. */
    container?: HTMLElement | null;
    /** Shared selection store — double-click also selects the targeted node. */
    selection?: EditorSelection;
    /** Resolve a node id to its spec node (for type + nothing else here). */
    getNode: (id: string) => UINode | null | undefined;
    /** The one-op seam (shared with the inspector) — commit emits node_prop_set. */
    ops: EditorOps;
    /** Node ids known from the spec — the precise id allow-list for resolution. */
    knownIds?: Set<string> | null;
    /** When false, double-click does nothing (preview mode). */
    enabled?: boolean;
    /** Fired when an element enters edit mode. */
    onbeginedit?: (id: string) => void;
    /** Fired after a commit applies an op (text actually changed). */
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

  // The element currently being edited, plus what we need to commit/restore.
  // Held outside $state on purpose: this is imperative DOM-edit bookkeeping, not
  // render state — the visible result comes from the op -> reactive re-render.
  interface EditSession {
    el: HTMLElement;
    id: string;
    prop: string;
    original: string;
    onKey: (e: KeyboardEvent) => void;
    onBlur: () => void;
  }
  let session: EditSession | null = null;

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

  function teardownDom(s: EditSession): void {
    s.el.removeEventListener('keydown', s.onKey);
    s.el.removeEventListener('blur', s.onBlur);
    s.el.removeAttribute('contenteditable');
    s.el.removeAttribute('data-ripple-editing');
  }

  function commit(): void {
    const s = session;
    if (!s) return;
    session = null; // re-entrancy guard: the contenteditable removal may blur.
    const value = normalizeInlineText(s.el.textContent);
    teardownDom(s);
    // Only emit when the text actually changed — keeps the op/undo stream clean.
    if (value !== normalizeInlineText(s.original)) {
      const applied = ops.setNodeProp(s.id, s.prop, value);
      if (applied) oncommit?.(s.id, s.prop, value);
    }
    // On commit the reactive re-render rewrites the element's text from the new
    // prop value (which equals `value`), so no manual textContent write needed.
  }

  function cancel(): void {
    const s = session;
    if (!s) return;
    session = null;
    teardownDom(s);
    // The spec was never mutated, so restoring the DOM text matches the model.
    s.el.textContent = s.original;
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

    session = { el, id, prop, original: el.textContent ?? '', onKey, onBlur };
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-ripple-editing', id);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
    el.focus();
    selectAll(el);
    onbeginedit?.(id);
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
      if (!node || !isInlineTextWidget(node.type)) return; // inspector handles the rest

      const prop = primaryTextProp(node.type);
      if (!prop) return;
      const el = findNodeElement(root, id, { knownIds });
      if (!el) return;

      e.preventDefault();
      beginEdit(el, id, prop);
    };

    root.addEventListener('dblclick', onDblClick);
    return () => {
      root.removeEventListener('dblclick', onDblClick);
      if (session) teardownDom(session);
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
