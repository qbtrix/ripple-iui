<!--
  @file editor/RippleInspector.svelte
  @description L2 (Svelte) PROPERTIES PANEL for the Ripple visual editor — the
    reusable inspector. As of EP-1 it is migrated onto the lane-agnostic
    `LaneAdapter` PORT: given an `adapter` + a `target` (TargetRef), it derives the
    editable fields via `adapter.getFields(target)` and renders the right control
    per kind (text / textarea / number / boolean / select). Every edit routes
    through `adapter.applyEdit(target, { kind: 'setProp', name, value })` with the
    RAW control value — the adapter owns coercion + the spec-mutator write, so this
    panel imports NOTHING from inferFields / coerceFieldValue / editor-ops anymore;
    it touches only the port. The same chrome can thus later drive other substrates
    (svelte source, html/css) by swapping the adapter.

    Behavior is identical to the pre-port panel: same controls, same empty/theming,
    and `onedit` still reports the COERCED stored value (read back through the port
    after the apply) so its readout is byte-for-byte what it was. Fully theme-aware:
    reads shadcn tokens as `var(--token)` (NOT `hsl(var(--token))` — the tokens
    already resolve to full hsl()).
  @created 2026-06-29 (editor chrome — properties panel)
  @changes 2026-06-30 (EP-1): migrate off node+ops onto the LaneAdapter port
    (adapter + target); coercion + write now live behind the port.
  @changes 2026-06-30 (EP-1 review): read `onedit`'s value via `adapter.readProp`
    (was `readNode().props[prop]`), so it reports the real stored value for
    top-level-colliding (`bind`) + dotted props instead of undefined.
-->
<script lang="ts">
  import type { LaneAdapter, TargetRef } from './core/index.js';

  interface Props {
    /** The lane adapter the panel edits through (the only seam it touches). */
    adapter: LaneAdapter;
    /** The selected target to edit, or null for the empty state. */
    target?: TargetRef | null;
    /** Extra classes for the panel root. */
    class?: string;
    /** Fired after an edit applies (uid, prop, coerced value). */
    onedit?: (uid: string, prop: string, value: unknown) => void;
  }

  let { adapter, target = null, class: className = '', onedit }: Props = $props();

  // Read the target node + its fields through the port. Both re-derive when the
  // adapter's live root mutates (getFields/readNode read it), so controls stay in
  // sync after an op — the panel is a pure view over the adapter.
  const node = $derived(target ? adapter.readNode(target) : null);
  const fields = $derived(target ? adapter.getFields(target) : []);

  // Pass the RAW control value to the port; the adapter coerces it. Report the
  // coerced, stored value back via `onedit` using `readProp` (mirrors the write
  // routing) — `readNode().props[prop]` misses top-level-colliding props like
  // `bind`, so the readback would otherwise be undefined for ~23 widgets.
  function commit(prop: string, raw: unknown) {
    if (!target) return;
    if (adapter.applyEdit(target, { kind: 'setProp', name: prop, value: raw })) {
      onedit?.(target.uid, prop, adapter.readProp(target, prop));
    }
  }
</script>

<div class={`ripple-inspector ${className}`} data-ripple-inspector>
  {#if !node}
    <p class="ri-empty">Select an element to edit its properties.</p>
  {:else}
    <header class="ri-head">
      <span class="ri-type">{node.type}</span>
      <span class="ri-id" title={node.uid}>{node.uid}</span>
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
                onchange={(e) => commit(f.prop, (e.currentTarget as HTMLInputElement).checked)}
              />
            {:else if f.kind === 'select'}
              <select
                class="ri-input"
                value={String(f.value ?? '')}
                onchange={(e) => commit(f.prop, (e.currentTarget as HTMLSelectElement).value)}
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
                oninput={(e) => commit(f.prop, (e.currentTarget as HTMLInputElement).value)}
              />
            {:else if f.kind === 'textarea'}
              <textarea
                class="ri-input ri-textarea"
                rows="3"
                value={String(f.value ?? '')}
                oninput={(e) => commit(f.prop, (e.currentTarget as HTMLTextAreaElement).value)}
              ></textarea>
            {:else}
              <input
                class="ri-input"
                type="text"
                value={String(f.value ?? '')}
                oninput={(e) => commit(f.prop, (e.currentTarget as HTMLInputElement).value)}
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
