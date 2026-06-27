<!--
  @file routes/editor-lab/+page.svelte
  @description SP-1a captain visual-check surface for the Ripple visual editor.
    Renders a representative spec via <Ripple ensureIds {spec}> inside a relative
    "stage", overlaid with <RippleEditorOverlay>. Click any widget to draw a
    selection box; hover shows a dashed box. Demonstrates SELECT-PARENT: clicking
    a non-id-forwarding widget (badge / metric / table) selects the nearest
    id-bearing ancestor. A side panel reads back the selected node id + type, and
    a "Re-measure" button bumps renderVersion to exercise the measure guard.
    SCOPE: selection + overlay only (SP-1a) — no inline edit / drag / persist.
  @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
-->
<script lang="ts">
  import { Ripple, findById } from '$lib/index.js';
  import type { UINode } from '$lib/schema/ui-spec.js';
  import { RippleEditorOverlay, createEditorSelection } from '$lib/editor/index.js';

  // Representative spec. Every node carries an explicit n_xxxxxxxx id, so
  // `ensureIds` is a no-op here (it only fills gaps) and knownIds is exact.
  // Non-forwarders (badge / metric / table) are nested so SELECT-PARENT lands on
  // a visible ancestor.
  const spec = {
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
          props: { text: 'Click a widget to select it. Hover to preview.', size: 'sm' }
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
  // overlay so author content can never be mistaken for a node.
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
  const knownIds = collectIds(spec.ui as UINode);

  let stageEl = $state<HTMLElement | null>(null);
  let renderVersion = $state(0);
  const selection = createEditorSelection();

  // Read-back of the currently selected node (type + props) for the panel.
  const selectedNode = $derived(
    selection.selectedId ? findById(spec.ui as UINode, selection.selectedId) : null
  );

  // Widgets whose root does not forward `id` (SP-0 fallback set) — for the
  // legend, so the captain knows which clicks are expected to select-parent.
  const selectParentWidgets = ['badge', 'metric', 'table'];
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">SP-1a</p>
    <h1>Ripple Editor — selection overlay</h1>
    <p class="lede">
      DOM-id selection on top of <code>&lt;Ripple ensureIds&gt;</code>. Click selects, hover previews.
    </p>
  </header>

  <div class="lab">
    <!-- The stage: relative so the overlay's absolute boxes align to it. -->
    <section class="stage-wrap">
      <div class="toolbar">
        <span class="muted">Live preview</span>
        <button class="btn" onclick={() => (renderVersion += 1)}>Re-measure</button>
        <button class="btn" onclick={() => selection.clear()}>Clear</button>
      </div>
      <div class="stage">
        <div class="stage-inner" bind:this={stageEl}>
          <Ripple ensureIds {spec} />
        </div>
        <RippleEditorOverlay container={stageEl} {selection} {knownIds} {renderVersion} />
      </div>
    </section>

    <!-- Inspector: read-only selection read-back. -->
    <aside class="inspector">
      <h2>Selection</h2>
      {#if selectedNode}
        <dl>
          <dt>node id</dt>
          <dd><code>{selection.selectedId}</code></dd>
          <dt>type</dt>
          <dd><code>{selectedNode.type}</code></dd>
          {#if selectedNode.props}
            <dt>props</dt>
            <dd><pre>{JSON.stringify(selectedNode.props, null, 2)}</pre></dd>
          {/if}
        </dl>
      {:else}
        <p class="muted">Nothing selected. Click a widget in the preview.</p>
      {/if}

      <h2>Hover</h2>
      <p class="muted">{selection.hoverId ?? '—'}</p>

      <h2>Select-parent</h2>
      <p class="muted">
        These widgets don't forward <code>id</code>, so clicking them selects their nearest id-bearing
        ancestor:
      </p>
      <ul class="chips">
        {#each selectParentWidgets as w (w)}
          <li>{w}</li>
        {/each}
      </ul>
    </aside>
  </div>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 24px 64px;
    color: #0f172a;
  }
  .page-head {
    margin-bottom: 20px;
  }
  .eyebrow {
    margin: 0;
    font: 700 11px/1 ui-monospace, monospace;
    letter-spacing: 0.12em;
    color: #3b82f6;
  }
  .page-head h1 {
    margin: 6px 0 4px;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .lede {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
  }
  .lab {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
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
  .btn {
    font: 600 12px/1 ui-sans-serif, system-ui;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
  }
  .btn:hover {
    background: #f8fafc;
  }
  /* The stage is the positioned ancestor; the overlay covers it. stage-inner
     holds the live render at the stage origin so box coords line up. */
  .stage {
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
  }
  .stage-inner {
    padding: 16px;
  }
  .inspector {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    padding: 16px;
    position: sticky;
    top: 16px;
  }
  .inspector h2 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin: 16px 0 6px;
  }
  .inspector h2:first-child {
    margin-top: 0;
  }
  .muted {
    color: #64748b;
    font-size: 0.85rem;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 4px 10px;
    align-items: baseline;
  }
  dt {
    color: #94a3b8;
    font-size: 0.75rem;
  }
  dd {
    margin: 0;
    font-size: 0.85rem;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8rem;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
  }
  pre {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    background: #f8fafc;
    border: 1px solid #eef2f7;
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
    background: #fef3c7;
    color: #92400e;
    padding: 3px 7px;
    border-radius: 5px;
  }
</style>
