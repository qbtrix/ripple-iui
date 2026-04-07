<!--
  C4GroupNode.svelte — SvelteFlow custom node for C4 system boundary group containers.
  Created: 2026-04-07 — Dashed border container used to draw system boundary boxes
  that nest child container nodes. Rendered as a SvelteFlow parent/group node.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '../types.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);

  function handleClick() {
    if (data.onclick && data.element) {
      data.onclick(data.element);
    }
  }
</script>

<Handle type="target" position={Position.Top} class="c4-handle" />
<Handle type="target" position={Position.Left} class="c4-handle" />
<Handle type="source" position={Position.Bottom} class="c4-handle" />
<Handle type="source" position={Position.Right} class="c4-handle" />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="c4-group-node"
  style="
    border-color: {isExternal ? 'rgba(107,114,128,0.35)' : 'rgba(37,99,235,0.3)'};
  "
  onclick={handleClick}
>
  <!-- Label in the top-left corner of the group box -->
  <div class="group-label">
    <span class="group-type">
      {isExternal ? 'External System' : 'Software System'}
    </span>
    <span class="group-name">{data.name}</span>
    {#if data.technology}
      <span class="group-tech">[{data.technology}]</span>
    {/if}
  </div>
</div>

<style>
  .c4-group-node {
    /* Group nodes need width/height set by SvelteFlow from ELK layout */
    width: 100%;
    height: 100%;
    border-radius: 12px;
    border: 1.5px dashed;
    background: rgba(37, 99, 235, 0.04);
    cursor: default;
    position: relative;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .group-label {
    position: absolute;
    top: -1px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(10, 15, 30, 0.85);
    padding: 2px 8px;
    border-radius: 0 0 6px 6px;
    pointer-events: auto;
    cursor: pointer;
  }

  .group-type {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(147, 197, 253, 0.6);
  }

  .group-name {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
  }

  .group-tech {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.35);
  }

  :global(.c4-handle) {
    width: 7px !important;
    height: 7px !important;
    background: rgba(255, 255, 255, 0.2) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
    border-radius: 50% !important;
  }
</style>
