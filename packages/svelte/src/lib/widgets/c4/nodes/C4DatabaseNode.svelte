<!--
  C4DatabaseNode.svelte — SvelteFlow custom node for C4 database containers.
  Created: 2026-04-07 — Purple cylinder-inspired shape for database elements.
  Modified: 2026-04-10 — Sanitize kb_article URL to prevent XSS via javascript:/data: schemes.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { safeKbUrl } from '../url-sanitizer.js';

  let { data }: { data: C4NodeData } = $props();

  const hasDrilldown = $derived(data.drillable ?? false);

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
  class="c4-database-node"
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <!-- Cylinder top cap (SVG ellipse) -->
  <div class="db-cap-top">
    <svg viewBox="0 0 180 28" preserveAspectRatio="none" width="100%" height="100%">
      <ellipse cx="90" cy="14" rx="88" ry="12" fill="rgba(124,58,237,0.7)" stroke="rgba(124,58,237,0.6)" stroke-width="1.5"/>
    </svg>
  </div>

  <!-- Cylinder body -->
  <div class="db-body">
    <div class="node-type-label">Database</div>
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

  <!-- Cylinder bottom cap -->
  <div class="db-cap-bottom">
    <svg viewBox="0 0 180 28" preserveAspectRatio="none" width="100%" height="100%">
      <ellipse cx="90" cy="14" rx="88" ry="12" fill="rgba(91,33,182,0.8)" stroke="rgba(124,58,237,0.6)" stroke-width="1.5"/>
    </svg>
  </div>

  {#if hasDrilldown}
    <div class="drill-indicator" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>

<style>
  .c4-database-node {
    display: flex;
    flex-direction: column;
    min-width: 160px;
    max-width: 180px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: filter 0.15s ease, transform 0.1s ease;
  }

  .c4-database-node:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .db-cap-top {
    width: 100%;
    height: 22px;
    flex-shrink: 0;
  }

  .db-body {
    background: rgba(109, 40, 217, 0.25);
    border-left: 1px solid rgba(124, 58, 237, 0.5);
    border-right: 1px solid rgba(124, 58, 237, 0.5);
    padding: 6px 12px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .db-cap-bottom {
    width: 100%;
    height: 22px;
    flex-shrink: 0;
    margin-top: -1px;
  }

  .node-type-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #C4B5FD;
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
    color: rgba(196, 181, 253, 0.7);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .node-desc {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    text-align: center;
    line-height: 1.4;
  }

  .kb-link {
    font-size: 8px;
    color: rgba(196, 181, 253, 0.6);
    text-decoration: none;
  }

  .kb-link:hover {
    color: rgba(196, 181, 253, 1);
  }

  .drill-indicator {
    position: absolute;
    top: 6px;
    right: 8px;
    color: rgba(255, 255, 255, 0.4);
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
