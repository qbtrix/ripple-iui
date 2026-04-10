<!--
  C4QueueNode.svelte — SvelteFlow custom node for C4 message queue elements.
  Created: 2026-04-07 — Amber parallelogram shape for queue/message broker elements.
  Modified: 2026-04-10 — Sanitize kb_article URL to prevent XSS via javascript:/data: schemes.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '../types.js';
  import { safeKbUrl } from '../url-sanitizer.js';

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
  class="c4-queue-node"
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <!-- Parallelogram shape via clip-path -->
  <div class="queue-shape">
    <div class="node-type-label">Message Queue</div>
    <div class="node-name">{data.name}</div>
    {#if data.technology}
      <div class="tech-badge">[{data.technology}]</div>
    {/if}
    {#if data.description}
      <div class="node-desc">
        {data.description.length > 50 ? data.description.slice(0, 50) + '…' : data.description}
      </div>
    {/if}
    {#if safeKbUrl(data.kb_article)}
      <a
        href={safeKbUrl(data.kb_article)}
        target="_blank"
        rel="noopener noreferrer"
        class="kb-link"
        onclick={(e) => e.stopPropagation()}
      >Docs</a>
    {/if}
  </div>
</div>

<style>
  .c4-queue-node {
    min-width: 180px;
    max-width: 200px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: filter 0.15s ease, transform 0.1s ease;
  }

  .c4-queue-node:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .queue-shape {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 6px;
    clip-path: polygon(16px 0%, 100% 0%, calc(100% - 16px) 100%, 0% 100%);
    padding: 10px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .node-type-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #FCD34D;
    opacity: 0.85;
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
    color: rgba(252, 211, 77, 0.7);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .node-desc {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.45);
    text-align: center;
    line-height: 1.4;
  }

  .kb-link {
    font-size: 8px;
    color: rgba(252, 211, 77, 0.6);
    text-decoration: none;
  }

  .kb-link:hover {
    color: rgba(252, 211, 77, 1);
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
