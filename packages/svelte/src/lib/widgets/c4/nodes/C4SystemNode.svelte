<!--
  C4SystemNode.svelte — SvelteFlow custom node for C4 System elements.
  Created: 2026-04-07 — Rounded rectangle, blue for internal, gray dashed for external systems.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);
  const hasDrilldown = $derived(data.drillable ?? false);

  const bgColor = $derived(isExternal ? 'rgba(107,114,128,0.12)' : 'rgba(37,99,235,0.15)');
  const borderColor = $derived(isExternal ? 'rgba(107,114,128,0.35)' : 'rgba(37,99,235,0.45)');
  const accentColor = $derived(isExternal ? '#6B7280' : '#2563EB');
  const textColor = $derived(isExternal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.88)');

  function handleClick() {
    if (hasDrilldown && data.ondrilldown && data.element) {
      const nextLevel = data.diagramLevel === 'context' ? 'container'
        : data.diagramLevel === 'container' ? 'component' : 'code';
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
  class="c4-system-node"
  style="
    background: {bgColor};
    border-color: {borderColor};
    border-style: {isExternal ? 'dashed' : 'solid'};
  "
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <!-- Type label strip -->
  <div class="node-type-label" style="color: {accentColor}">
    {isExternal ? 'External System' : 'Software System'}
  </div>

  <!-- Name -->
  <div class="node-name" style="color: {textColor}">{data.name}</div>

  <!-- Description -->
  {#if data.description}
    <div class="node-desc" style="color: {isExternal ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)'}">
      {data.description.length > 60 ? data.description.slice(0, 60) + '…' : data.description}
    </div>
  {/if}

  <!-- Technology badge -->
  {#if data.technology}
    <div class="tech-badge" style="background: rgba(255,255,255,0.07); color: {textColor}; opacity: 0.8;">
      [{data.technology}]
    </div>
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
  .c4-system-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 14px 10px;
    border-radius: 10px;
    border-width: 1px;
    min-width: 180px;
    max-width: 200px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: box-shadow 0.15s ease, transform 0.1s ease;
  }

  .c4-system-node:hover {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.5);
    transform: translateY(-1px);
  }

  .node-type-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.8;
  }

  .node-name {
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }

  .node-desc {
    font-size: 9px;
    text-align: center;
    line-height: 1.4;
  }

  .tech-badge {
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 4px;
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
