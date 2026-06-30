<!--
  @file editor/RippleInspector.svelte
  @description L2 (Svelte) PROPERTIES PANEL for the Ripple visual editor — the
    reusable inspector that replaces the lab's inline, text-only field list. Given
    the selected node, it derives a typed, editable field per prop from the widget
    manifest (`inferFields`, L1) and renders the right control: text / textarea /
    number / boolean / select. Every edit routes through the SAME `EditorOps` seam
    (`ops.setNodeProp`) the inline editor uses, so the canvas repaints reactively
    and persistence intercepts at `onApplied` — one op path for all edits.

    Manifest-driven, so a new widget/prop is editable the moment it lands; complex
    props (arrays/objects) are classified readonly by the L1 and omitted. Fully
    theme-aware: reads shadcn tokens as `var(--token)` (NOT `hsl(var(--token))` —
    the tokens already resolve to full hsl()).
  @created 2026-06-29 (editor chrome — properties panel)
-->
<script lang="ts">
  import type { UINode } from '../schema/ui-spec.js';
  import type { EditorOps } from './core/editor-ops.js';
  import { inferFields, coerceFieldValue } from './core/inspector-fields.js';

  interface Props {
    /** The selected node to edit, or null for the empty state. */
    node?: UINode | null;
    /** The shared one-op seam (same instance the inline editor + canvas use). */
    ops: EditorOps;
    /** Extra classes for the panel root. */
    class?: string;
    /** Fired after an edit applies (id, prop, coerced value). */
    onedit?: (id: string, prop: string, value: unknown) => void;
  }

  let { node = null, ops, class: className = '', onedit }: Props = $props();

  // Fields re-derive from the (reactive) node, so controls stay in sync after an
  // op mutates the spec — the panel is a pure view over inferFields().
  const fields = $derived(inferFields(node));

  function commit(prop: string, kind: Parameters<typeof coerceFieldValue>[0], raw: unknown, numeric = false) {
    if (!node?.id) return;
    const value = coerceFieldValue(kind, raw, numeric);
    if (ops.setNodeProp(node.id, prop, value)) onedit?.(node.id, prop, value);
  }
</script>

<div class={`ripple-inspector ${className}`} data-ripple-inspector>
  {#if !node}
    <p class="ri-empty">Select an element to edit its properties.</p>
  {:else}
    <header class="ri-head">
      <span class="ri-type">{node.type}</span>
      <span class="ri-id" title={node.id}>{node.id}</span>
    </header>

    {#if fields.length === 0}
      <p class="ri-empty">No editable properties for this widget.</p>
    {:else}
      <div class="ri-fields">
        {#each fields as f (f.prop)}
          <label class="ri-field" title={f.description}>
            <span class="ri-label">{f.label}</span>

            {#if f.kind === 'boolean'}
              <input
                class="ri-checkbox"
                type="checkbox"
                checked={Boolean(f.value)}
                onchange={(e) => commit(f.prop, f.kind, (e.currentTarget as HTMLInputElement).checked)}
              />
            {:else if f.kind === 'select'}
              <select
                class="ri-input"
                value={String(f.value ?? '')}
                onchange={(e) => commit(f.prop, f.kind, (e.currentTarget as HTMLSelectElement).value, f.numeric)}
              >
                {#each f.options ?? [] as opt (opt)}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            {:else if f.kind === 'number'}
              <input
                class="ri-input"
                type="number"
                value={f.value as number}
                oninput={(e) => commit(f.prop, f.kind, (e.currentTarget as HTMLInputElement).value)}
              />
            {:else if f.kind === 'textarea'}
              <textarea
                class="ri-input ri-textarea"
                rows="3"
                value={String(f.value ?? '')}
                oninput={(e) => commit(f.prop, f.kind, (e.currentTarget as HTMLTextAreaElement).value)}
              ></textarea>
            {:else}
              <input
                class="ri-input"
                type="text"
                value={String(f.value ?? '')}
                oninput={(e) => commit(f.prop, f.kind, (e.currentTarget as HTMLInputElement).value)}
              />
            {/if}
          </label>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .ripple-inspector {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--foreground);
    font-size: 0.85rem;
  }
  .ri-empty {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.85rem;
  }
  .ri-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .ri-type {
    font-weight: 600;
    font-size: 0.8rem;
  }
  .ri-id {
    font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 55%;
  }
  .ri-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ri-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  /* Boolean rows read better as a single inline line. */
  .ri-field:has(.ri-checkbox) {
    flex-direction: row-reverse;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }
  .ri-label {
    font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--muted-foreground);
  }
  .ri-input {
    width: 100%;
    font: 400 0.85rem/1.4 ui-sans-serif, system-ui;
    padding: 6px 8px;
    border: 1px solid var(--input);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
  }
  .ri-input:focus {
    outline: 2px solid var(--ring);
    outline-offset: 0;
    border-color: var(--ring);
  }
  .ri-textarea {
    resize: vertical;
    min-height: 56px;
  }
  .ri-checkbox {
    width: 15px;
    height: 15px;
    accent-color: var(--primary);
    cursor: pointer;
  }
</style>
