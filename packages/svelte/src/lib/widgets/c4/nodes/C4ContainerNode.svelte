<!--
  C4ContainerNode.svelte — SvelteFlow custom node for C4 Container elements.
  Created: 2026-04-07 — Blue-700 box with technology label, handles drill-down to components.
  Modified: 2026-04-10 — Sanitize kb_article URL to prevent XSS via javascript:/data: schemes.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { safeKbUrl } from '../url-sanitizer.js';

  let { data }: { data: C4NodeData } = $props();

  const hasDrilldown = $derived(data.drillable ?? false);

  function handleClick() {
    if (hasDrilldown && data.ondrilldown && data.element) {
      const nextLevel = data.diagramLevel === 'container' ? 'component' : 'code';
      data.ondrilldown(data.element, nextLevel);
    } else if (data.onclick && data.element) {
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
  class="c4-container-node"
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <div class="node-type-label">Container</div>

  <div class="node-name">{data.name}</div>

  {#if data.technology}
    <div class="tech-badge">[{data.technology}]</div>
  {/if}

  {#if data.description}
    <div class="node-desc">
      {data.description.length > 55 ? data.description.slice(0, 55) + '…' : data.description}
    </div>
  {/if}

  {#if safeKbUrl(data.kb_article)}
    <a
      href={safeKbUrl(data.kb_article)}
      target="_blank"
      rel="noopener noreferrer"
      class="kb-link"
      onclick={(e) => e.stopPropagation()}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6M8 13h8M8 17h5"/>
      </svg>
      Docs
    </a>
  {/if}

  {#if hasDrilldown}
    <div class="drill-indicator" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>

<style>
  .c4-container-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(29, 78, 216, 0.45);
    background: rgba(29, 78, 216, 0.15);
    min-width: 180px;
    max-width: 200px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: box-shadow 0.15s ease, transform 0.1s ease;
  }

  .c4-container-node:hover {
    box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.6);
    transform: translateY(-1px);
  }

  .node-type-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #60A5FA;
    opacity: 0.8;
  }

  .node-name {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }

  .tech-badge {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.07);
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
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 8px;
    color: rgba(96, 165, 250, 0.7);
    text-decoration: none;
    margin-top: 2px;
  }

  .kb-link:hover {
    color: rgba(96, 165, 250, 1);
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
