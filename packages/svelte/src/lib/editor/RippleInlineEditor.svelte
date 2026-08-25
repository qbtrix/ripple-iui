<!--
  @file editor/RippleInlineEditor.svelte
  @description L2 (Svelte) INLINE EDIT controller for the Ripple visual editor.
    A headless controller (renders no chrome, only a `:global` editing-outline
    style): it delegates ONE `dblclick` listener on the render `container`,
    resolves the target to a node ref THROUGH THE LaneAdapter port
    (`adapter.resolveElement`, the same SELECT-PARENT walk the overlay uses), and
    opens a pluggable `InlineEditor` on it.

    SLOT SELECTION (EP-3) — the controller no longer mounts TipTap / contenteditable
    itself; it picks an `InlineEditor` impl by the node's edit policy:
      • PLAIN TEXT (`isInlineTextWidget`) — heading / text / badge / button: always
        `ContentEditableInlineEditor`, seeded from the element's textContent.
      • RICH HTML (`isRichTextWidget`) — `richtext`: the LANE's rich editor, chosen
        by `adapter.inlineEditor` ('tiptap' -> the built-in `TipTapInlineEditor`;
        'squire' / 'overlay' resolved from the registry, reserved for EP-4's
        source-fidelity lane), seeded from `RICH_TEXT_PROP` read through the port.
    The chosen impl OWNS its Enter / Escape / blur, focus, teardown, and the
    `data-ripple-editing` clearing (the EP-1 stuck-outline fix). The controller only
    marks `data-ripple-editing` on open, routes the impl's `onCommit(value)` to
    `adapter.applyEdit(ref, { kind: 'setText', html: value })`, and tears the active
    impl down (`handle.destroy()`) on re-entry / unmount. Ripple behavior is
    UNCHANGED — same widgets, same keys, same commit semantics — only the mounting
    is now behind the slot, so EP-4 can supply a Squire/overlay impl with no edit
    here.

    Both commit paths write THROUGH THE LaneAdapter PORT (`applyEdit({ kind:
    'setText' })`), so the canvas repaints reactively (SP-0 §3) and persistence
    intercepts the same op stream via the adapter's `onApplied` — the adapter maps
    `setText` to the same `node_prop_set` on the node's primary text (or `html`)
    prop the pre-port path emitted, so the write is byte-identical.
  @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
  @changes 2026-06-30 (editor chrome PIECE 1): added the TipTap RICH-HTML path for
    `richtext` widgets alongside the existing contenteditable text path.
  @changes 2026-06-30 (EP-2): migrated onto the LaneAdapter PORT — resolution,
    edit-path decision + seed read, and commits all go through the adapter.
  @changes 2026-06-30 (EP-3): extracted the editor MOUNTING into the pluggable
    `InlineEditor` slot. The controller no longer imports `@tiptap/core` or mounts
    contenteditable directly — it selects an impl (plain -> `ContentEditableInline
    Editor`; rich -> the lane's editor via `adapter.inlineEditor`) and delegates
    mount / commit / cancel / teardown to it. Zero behavior change.
-->
<script lang="ts">
  import { findNodeElement, isInlineTextWidget, isRichTextWidget, primaryTextProp, RICH_TEXT_PROP, ContentEditableInlineEditor, TipTapInlineEditor, resolveInlineEditor, type LaneAdapter, type TargetRef, type InlineEditor, type InlineEditorHandle } from './core/index.js';
  import { EditorSelection } from './editor-selection.svelte.js';

  interface Props {
    /** The lane adapter the editor RESOLVES / READS / WRITES through (its only port seam). */
    adapter: LaneAdapter;
    /** Element wrapping the mounted <Ripple> whose nodes are edited. */
    container?: HTMLElement | null;
    /** Shared selection store — double-click also selects the targeted node. */
    selection?: EditorSelection;
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
    adapter,
    container = null,
    selection = new EditorSelection(),
    enabled = true,
    onbeginedit,
    oncommit,
    oncancel
  }: Props = $props();

  // Build the lane-scoped ref for a resolved node id (the adapter stamps the lane).
  const refOf = (uid: string): TargetRef => ({ uid, lane: adapter.id });

  // The RICH editor impl for this lane. 'tiptap' is the ripple built-in; other kinds
  // ('squire' / 'overlay') resolve from the registry, which EP-4 populates from the
  // svelte lane WITHOUT editing this controller. Unregistered kind -> null (no edit).
  function richInlineEditorFor(kind: string): InlineEditor | null {
    return kind === 'tiptap' ? TipTapInlineEditor : resolveInlineEditor(kind);
  }

  // The current edit: the element under edit, its node id, and the live impl handle.
  // Held OUTSIDE $state on purpose — this is imperative edit bookkeeping, not render
  // state; the visible result comes from the op -> reactive re-render.
  interface ActiveEdit {
    el: HTMLElement;
    id: string;
    handle: InlineEditorHandle;
  }
  let active: ActiveEdit | null = null;

  // Open `impl` on `el` for node `id`, routing its commit/cancel back through the
  // port. `prop` is the prop reported on the `oncommit` event (text prop / html).
  function openEditor(impl: InlineEditor, el: HTMLElement, id: string, prop: string, content: string): void {
    el.setAttribute('data-ripple-editing', id); // the editing outline (impl clears it on teardown)
    const handle = impl.mount(el, {
      content,
      onCommit: (value: string) => {
        // Write THROUGH THE PORT: setText targets the node's primary text / html prop
        // — the adapter maps it to the same node_prop_set the pre-port path emitted.
        const applied = adapter.applyEdit(refOf(id), { kind: 'setText', html: value });
        if (applied) oncommit?.(id, prop, value);
        if (active?.handle === handle) active = null;
      },
      onCancel: () => {
        // No op applied (the impl already restored the seed content).
        if (active?.handle === handle) active = null;
        oncancel?.(id);
      }
    });
    active = { el, id, handle };
    onbeginedit?.(id);
  }

  $effect(() => {
    const root = container;
    if (!root || !enabled) return;

    const onDblClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Ignore double-clicks inside the element we're already editing.
      if (active && target && active.el.contains(target)) return;

      // Resolve THROUGH THE PORT — the adapter carries its own knownIds + boundary,
      // so this is identical to the pre-port resolveElementToNodeId on the stage.
      const ref = target instanceof Element ? adapter.resolveElement(target) : null;
      if (!ref) return;
      const id = ref.uid;
      // A fresh double-click on a different node tears the previous edit down first
      // (in a browser its blur already committed it; this clears the outline in any
      // case — the EP-1 stuck-outline regression).
      if (active && active.id !== id) {
        active.handle.destroy();
        active = null;
      }

      selection.select(id);
      // Read the node THROUGH THE PORT to pick the edit path by its type.
      const node = adapter.readNode(ref);
      if (!node) return;
      // Find the DOM element to mount on — lane-agnostic DOM location (like the
      // overlay's buildBoundsIndex). The recognized id format matches every ripple
      // node id, so the already-resolved id needs no knownIds allow-list to locate.
      const el = findNodeElement(root, id);
      if (!el) return; // non-id-forwarding widget — inspector handles it

      if (isRichTextWidget(node.type)) {
        const impl = richInlineEditorFor(adapter.inlineEditor ?? 'tiptap');
        if (!impl) return; // no rich editor registered for this lane (e.g. squire pre-EP-4)
        e.preventDefault();
        // Seed the rich editor from the html prop, read back THROUGH THE PORT.
        const html = adapter.readProp(ref, RICH_TEXT_PROP);
        openEditor(impl, el, id, RICH_TEXT_PROP, typeof html === 'string' ? html : '');
        return;
      }

      if (!isInlineTextWidget(node.type)) return; // inspector handles the rest
      const prop = primaryTextProp(node.type);
      if (!prop) return;

      e.preventDefault();
      // Seed the plain editor from the element's textContent (== its primary prop).
      openEditor(ContentEditableInlineEditor, el, id, prop, el.textContent ?? '');
    };

    root.addEventListener('dblclick', onDblClick);
    return () => {
      root.removeEventListener('dblclick', onDblClick);
      // Silent teardown of any in-flight edit (no commit / cancel) on unmount.
      active?.handle.destroy();
      active = null;
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
