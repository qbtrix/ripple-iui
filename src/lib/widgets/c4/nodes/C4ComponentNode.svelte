<!--
  C4ComponentNode.svelte — SvelteFlow custom node for C4 Component elements.
  Created: 2026-04-07 — Smaller blue-500 box with component type label and KB link support.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '../types.js';

  let { data }: { data: C4NodeData } = $props();

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
  class="c4-component-node"
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <!-- Small component icon in corner -->
  <div class="component-icon">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  </div>

  <div class="node-type-label">
    {data.subtype ? data.subtype.charAt(0).toUpperCase() + data.subtype.slice(1) : 'Component'}
  </div>

  <div class="node-name">{data.name}</div>

  {#if data.technology}
    <div class="tech-badge">[{data.technology}]</div>
  {/if}

  {#if data.description}
    <div class="node-desc">
      {data.description.length > 50 ? data.description.slice(0, 50) + '…' : data.description}
    </div>
  {/if}

  {#if data.kb_article}
    <a
      href={data.kb_article}
      target="_blank"
      rel="noopener noreferrer"
      class="kb-link"
      onclick={(e) => e.stopPropagation()}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
      Docs
    </a>
  {/if}
</div>

<style>
  .c4-component-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 12px 8px;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.12);
    min-width: 150px;
    max-width: 170px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: box-shadow 0.15s ease, transform 0.1s ease;
  }

  .c4-component-node:hover {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    transform: translateY(-1px);
  }

  .component-icon {
    position: absolute;
    top: 6px;
    left: 8px;
    color: rgba(147, 197, 253, 0.5);
  }

  .node-type-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #93C5FD;
    opacity: 0.8;
  }

  .node-name {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }

  .tech-badge {
    font-size: 9px;
    color: rgba(147, 197, 253, 0.65);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 4px;
  }

  .node-desc {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    text-align: center;
    line-height: 1.4;
  }

  .kb-link {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 8px;
    color: rgba(147, 197, 253, 0.6);
    text-decoration: none;
    margin-top: 1px;
  }

  .kb-link:hover {
    color: rgba(147, 197, 253, 1);
  }

  :global(.c4-handle) {
    width: 7px !important;
    height: 7px !important;
    background: rgba(255, 255, 255, 0.2) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
    border-radius: 50% !important;
  }

  :global(.c4-handle:hover) {
    background: rgba(255, 255, 255, 0.45) !important;
  }
</style>
