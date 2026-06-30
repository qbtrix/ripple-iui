<!--
  @file routes/editor-lab/+page.svelte
  @changed 2026-06-29: theming. Hardcoded hex swapped for theme tokens
    (var(--token) + color-mix) so the lab follows light/dark like the app.
  @description Captain visual-check surface for the Ripple visual editor.
    Renders a representative spec via <Ripple ensureIds {spec}> inside a relative
    "stage", overlaid with <RippleEditorOverlay> (SP-1a select/hover) and driven
    by <RippleInlineEditor> (SP-1b inline text edit). The spec is held in $state
    so spec-mutator ops are reactive.

    SP-1a (kept): click any widget to draw a selection box; hover shows a dashed
    box; non-id-forwarding widgets (badge / metric / table) SELECT-PARENT to the
    nearest id-bearing ancestor.

    SP-1b (new): DOUBLE-CLICK a single-text widget (heading / text / button) to
    edit it in place — type, then Enter or click away to commit; Escape cancels.
    The inspector renders an editable field per editable text prop of the selected
    node (e.g. card title, badge text, alert title/description) — editing it
    updates the canvas live. BOTH paths emit exactly one `node_prop_set` through
    the shared EditorOps seam, so they share one code path and SP-1c persistence
    can intercept it at `onApplied`.

    SP-1c-b (new): the persistence PORT is now wired to the lab. A single
    in-memory MemoryPersistenceAdapter backs a clickable round-trip — "Save
    snapshot" drafts then publishes the current spec as a revision, the inspector
    lists the revisions, and each "Restore" reverts the canvas to that revision.
    The adapter is UINode-shaped (it stores spec.ui, the editor's root), so the
    real Branch-backed adapter drops in behind the same interface unchanged.
  @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
  @changes 2026-06-27 (SP-1b): spec -> $state; EditorOps seam; RippleInlineEditor
    mounted; inspector upgraded from read-only to editable text fields.
  @changes 2026-06-28 (SP-1c-b): wired MemoryPersistenceAdapter — Save snapshot,
    revisions list, and Restore — surfacing the persistence port in the lab.
-->
<script lang="ts">
  import { Ripple, findById } from '$lib/index.js';
  import type { UINode } from '$lib/schema/ui-spec.js';
  import {
    RippleEditorOverlay,
    RippleInlineEditor,
    RippleInspector,
    RippleDragLayer,
    createEditorSelection,
    createEditorOps,
    MemoryPersistenceAdapter,
    type Revision
  } from '$lib/editor/index.js';

  // Representative spec. Every node carries an explicit n_xxxxxxxx id, so
  // `ensureIds` is a no-op here (it only fills gaps) and knownIds is exact.
  // Non-forwarders (badge / metric / table) are nested so SELECT-PARENT lands on
  // a visible ancestor. Defined as a plain literal first so knownIds is derived
  // from it without referencing $state during init.
  const INITIAL = {
    version: '1.0' as const,
    ui: {
      type: 'container',
      id: 'n_root0001',
      props: { padding: 'lg' },
      children: [
        { type: 'navbar', id: 'n_navbar01', props: { brand: 'Ripple Studio' } },
        { type: 'heading', id: 'n_head0001', props: { text: 'Editor Lab', level: 2 } },
        {
          type: 'text',
          id: 'n_text0001',
          props: { text: 'Double-click a heading, this text, or a button to edit it inline.', size: 'sm' }
        },
        // richtext is a DISPLAY widget; double-click mounts a TipTap editor in
        // place to author its `html` prop (rich-HTML inline edit, PIECE 1).
        {
          type: 'richtext',
          id: 'n_prose001',
          props: { html: '<p>Double-click to edit <strong>rich</strong> text. Try a <em>list</em> or <code>code</code>.</p>' }
        },
        {
          type: 'flex',
          id: 'n_row00001',
          props: { gap: '8px', align: 'center', wrap: 'wrap' },
          children: [
            { type: 'button', id: 'n_btnsave1', props: { label: 'Save', variant: 'default' } },
            { type: 'button', id: 'n_btnedit1', props: { label: 'Edit', variant: 'outline' } },
            { type: 'input', id: 'n_input001', props: { placeholder: 'Search…' } }
          ]
        },
        {
          type: 'grid',
          id: 'n_grid0001',
          props: { columns: 3, gap: '12px' },
          children: [
            {
              type: 'card',
              id: 'n_cardrev1',
              props: { title: 'Revenue' },
              children: [{ type: 'stat', id: 'n_stat0001', props: { label: 'MRR', value: '$12.4k' } }]
            },
            {
              type: 'card',
              id: 'n_cardusr1',
              props: { title: 'Users' },
              // metric does NOT forward id — clicking it select-parents to this card.
              children: [{ type: 'metric', id: 'n_metric01', props: { label: 'Active', value: 1280 } }]
            },
            {
              type: 'card',
              id: 'n_cardnew1',
              props: { title: 'Status' },
              // badge does NOT forward id — clicking it select-parents to this card.
              children: [{ type: 'badge', id: 'n_badge001', props: { text: 'Live', variant: 'success' } }]
            }
          ]
        },
        // table does NOT forward id — clicking it select-parents to the root container.
        {
          type: 'table',
          id: 'n_table001',
          props: {
            variant: 'compact',
            columns: [
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role' }
            ],
            rows: [
              { name: 'Ada', role: 'Engineer' },
              { name: 'Linus', role: 'Maintainer' }
            ]
          }
        },
        {
          type: 'form',
          id: 'n_form0001',
          children: [{ type: 'input', id: 'n_finput01', props: { label: 'Email', placeholder: 'you@co' } }]
        }
      ]
    }
  };

  // Walk the spec collecting node ids — the precise allow-list passed to the
  // overlay/inline editor so author content can never be mistaken for a node.
  function collectIds(node: UINode, out = new Set<string>()): Set<string> {
    if (node && typeof node === 'object') {
      if (node.id) out.add(node.id);
      for (const key of ['children', 'else_children'] as const) {
        const kids = (node as Record<string, unknown>)[key];
        if (Array.isArray(kids)) for (const k of kids) collectIds(k as UINode, out);
      }
    }
    return out;
  }
  // Editing only changes prop VALUES (never ids), so the id allow-list computed
  // from the initial literal stays correct for the life of the page.
  const knownIds = collectIds(INITIAL.ui as UINode);

  // The editor OWNS the spec as $state (a deep proxy) so spec-mutator's in-place
  // ops are reactive (SP-0 §3). Cloned so the INITIAL literal is never mutated.
  let spec = $state(structuredClone(INITIAL));

  let stageEl = $state<HTMLElement | null>(null);
  let renderVersion = $state(0);
  let lastEdit = $state<string | null>(null);
  const selection = createEditorSelection();

  // SP-1c-b: wire the persistence PORT into the lab. One in-memory adapter keeps
  // the whole Save -> publish -> revisions -> Restore round-trip clickable with
  // no backend; the real Branch-backed adapter implements the same interface
  // host-side. The port is UINode-shaped, so we seed / save / restore spec.ui
  // (the editor's root), never the { version, ui } envelope.
  const persistence = new MemoryPersistenceAdapter();
  const scopeId = 'lab';
  persistence.seed(scopeId, INITIAL.ui as UINode);
  let revisions = $state<Revision[]>([]);
  let persistStatus = $state<string | null>(null);

  // The single op seam shared by inline edit AND the inspector. onApplied bumps
  // renderVersion so the overlay re-measures after text reflows; SP-1c will also
  // saveDraft(spec) here.
  const ops = createEditorOps({
    getRoot: () => spec.ui as UINode,
    onApplied: () => {
      renderVersion += 1;
    }
  });

  // Read-back of the currently selected node for the inspector.
  const selectedNode = $derived(
    selection.selectedId ? findById(spec.ui as UINode, selection.selectedId) : null
  );
  // Inline edit + the inspector both flow through `ops`; the inspector derives its
  // own fields from `selectedNode`, so no per-prop wiring lives in the lab anymore.

  // SP-1c-b: Save snapshot = draft the live spec, publish it as a revision, then
  // refresh the list. $state.snapshot peels a plain object off the $state proxy
  // so the adapter's structuredClone never sees a proxy.
  async function saveSnapshot() {
    const draft = await persistence.saveDraft(scopeId, $state.snapshot(spec.ui) as UINode);
    const rev = await persistence.publish(scopeId, draft);
    revisions = await persistence.listRevisions(scopeId);
    persistStatus = `Saved ${rev.revisionId}`;
  }

  // SP-1c-b: Restore reverts the canvas to a chosen revision. Assigning the
  // returned (plain) UINode back into spec.ui re-proxies it under $state, so
  // <Ripple> repaints; bump renderVersion so the overlay re-measures the new DOM
  // and any live selection box stays aligned. (Cast into spec.ui's narrower slot
  // — restore returns the general UINode the adapter stored.)
  async function restoreRevision(revisionId: string) {
    spec.ui = (await persistence.restore(scopeId, revisionId)) as typeof spec.ui;
    renderVersion += 1;
    persistStatus = `Restored ${revisionId}`;
  }

  // After the #79 id-forwarding codemod, badge / metric / table forward their id
  // and select DIRECTLY, so nothing in this sample triggers select-parent anymore.
  // Select-parent stays the fallback for widgets that don't render their own
  // id-bearing root (e.g. control-flow wrappers); list them here if the sample
  // ever includes one.
  const selectParentWidgets: string[] = [];
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">SP-1c-b</p>
    <h1>Ripple Editor — edit, snapshot, restore</h1>
    <p class="lede">
      Click selects, hover previews (SP-1a). <strong>Double-click</strong> a heading / text / button
      to edit it in place (or the rich-text block for formatted HTML), or edit a prop in the
      inspector — both update the canvas live. With a node selected, <strong>drag the grip</strong>
      (top-right) to reorder it among its siblings.
      <strong>Save snapshot</strong> publishes a revision; <strong>Restore</strong> reverts the canvas to it.
    </p>
  </header>

  <div class="lab">
    <!-- The stage: relative so the overlay's absolute boxes align to it. -->
    <section class="stage-wrap">
      <div class="toolbar">
        <span class="muted">Live preview</span>
        {#if lastEdit}<span class="last-edit" title="last applied op">{lastEdit}</span>{/if}
        <button class="btn btn-primary" onclick={saveSnapshot}>Save snapshot</button>
        <button class="btn" onclick={() => (renderVersion += 1)}>Re-measure</button>
        <button class="btn" onclick={() => selection.clear()}>Clear</button>
      </div>
      <div class="stage">
        <div class="stage-inner" bind:this={stageEl}>
          <Ripple ensureIds {spec} />
        </div>
        <RippleEditorOverlay container={stageEl} {selection} {knownIds} {renderVersion} />
        <RippleInlineEditor
          container={stageEl}
          {selection}
          {ops}
          {knownIds}
          getNode={(id) => findById(spec.ui as UINode, id)}
          oncommit={(id, prop, value) => (lastEdit = `${id}.${prop} = "${value}"`)}
        />
        <!-- PIECE 2: a grip on the selected node drags it to reorder among siblings. -->
        <RippleDragLayer
          container={stageEl}
          {selection}
          {ops}
          {knownIds}
          {renderVersion}
          getRoot={() => spec.ui as UINode}
          onreorder={(t) => (lastEdit = `moved ${t.node_id} after "${t.after_id || '(first)'}"`)}
        />
      </div>
    </section>

    <!-- Inspector: persistence history + editable text props of the selection. -->
    <aside class="inspector">
      <!-- SP-1c-b: persistence round-trip. "Save snapshot" (in the toolbar)
           publishes a revision; each entry below restores the canvas to it. -->
      <h2>Versions</h2>
      {#if persistStatus}<p class="persist-status">{persistStatus}</p>{/if}
      {#if revisions.length > 0}
        <ol class="revisions">
          {#each revisions as rev (rev.revisionId)}
            <li class="revision">
              <code>{rev.revisionId}</code>
              <button class="btn btn-sm" onclick={() => restoreRevision(rev.revisionId)}>Restore</button>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="muted">No snapshots yet. Edit a widget, then press "Save snapshot" above the canvas.</p>
      {/if}

      <h2>Properties</h2>
      <RippleInspector
        node={selectedNode}
        {ops}
        onedit={(id, prop, value) => (lastEdit = `${id}.${prop} = ${JSON.stringify(value)}`)}
      />

      {#if selectedNode?.props}
        <h2>Props (live)</h2>
        <pre>{JSON.stringify(selectedNode.props, null, 2)}</pre>
      {/if}

      <h2>Hover</h2>
      <p class="muted">{selection.hoverId ?? '—'}</p>

      <h2>Select-parent</h2>
      <p class="muted">
        Select-parent is the fallback for a widget that doesn't render its own
        <code>id</code>-bearing root. After the id-forwarding codemod, the sampled
        widgets (including badge, metric, and table) all forward their
        <code>id</code> and select directly, so none of them trigger it here.
      </p>
      {#if selectParentWidgets.length}
        <ul class="chips">
          {#each selectParentWidgets as w (w)}
            <li>{w}</li>
          {/each}
        </ul>
      {/if}
    </aside>
  </div>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 24px 64px;
    color: var(--foreground);
  }
  .page-head {
    margin-bottom: 20px;
  }
  .eyebrow {
    margin: 0;
    font: 700 11px/1 ui-monospace, monospace;
    letter-spacing: 0.12em;
    color: var(--primary);
  }
  .page-head h1 {
    margin: 6px 0 4px;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .lede {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.9rem;
  }
  .lab {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .lab {
      grid-template-columns: 1fr;
    }
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .toolbar .muted {
    margin-right: auto;
  }
  .last-edit {
    font: 600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent);
    padding: 3px 7px;
    border-radius: 5px;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .btn {
    font: 600 12px/1 ui-sans-serif, system-ui;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    cursor: pointer;
  }
  .btn:hover {
    background: var(--muted);
  }
  .btn-primary {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .btn-primary:hover {
    background: color-mix(in srgb, var(--primary) 90%, transparent);
  }
  .btn-sm {
    padding: 3px 8px;
    font-size: 11px;
  }
  /* The stage is the positioned ancestor; the overlay covers it. stage-inner
     holds the live render at the stage origin so box coords line up. */
  .stage {
    position: relative;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    overflow: hidden;
  }
  .stage-inner {
    padding: 16px;
  }
  .inspector {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    padding: 16px;
    position: sticky;
    top: 16px;
  }
  .inspector h2 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
    margin: 16px 0 6px;
  }
  .inspector h2:first-child {
    margin-top: 0;
  }
  .muted {
    color: var(--muted-foreground);
    font-size: 0.85rem;
  }
  .persist-status {
    font: 600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: hsl(160 84% 39%);
    background: color-mix(in srgb, hsl(160 84% 39%) 12%, transparent);
    border: 1px solid color-mix(in srgb, hsl(160 84% 39%) 24%, transparent);
    padding: 4px 8px;
    border-radius: 5px;
    margin: 0 0 8px;
  }
  .revisions {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .revision {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--muted);
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8rem;
    background: var(--muted);
    color: var(--foreground);
    padding: 1px 5px;
    border-radius: 4px;
  }
  pre {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    background: var(--muted);
    color: var(--foreground);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .chips {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chips li {
    font: 600 11px/1 ui-monospace, monospace;
    background: color-mix(in srgb, hsl(38 92% 50%) 16%, transparent);
    color: hsl(38 92% 42%);
    padding: 3px 7px;
    border-radius: 5px;
  }
</style>
