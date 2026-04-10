<!--
  C4PersonNode.svelte — SvelteFlow custom node for C4 Person elements.
  Created: 2026-04-07 — Circle-head + body shape, internal (blue) or external (gray) styling.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '../types.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);
  const hasDrilldown = $derived(data.drillable ?? false);

  // Color palette
  const bgColor = $derived(isExternal ? 'rgba(107,114,128,0.15)' : 'rgba(10,132,255,0.15)');
  const borderColor = $derived(isExternal ? 'rgba(107,114,128,0.4)' : 'rgba(10,132,255,0.4)');
  const headColor = $derived(isExternal ? '#6B7280' : '#0A84FF');
  const textColor = $derived(isExternal ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.9)');

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

<!-- All handles — SvelteFlow uses these for edge attachment -->
<Handle type="target" position={Position.Top} class="c4-handle" />
<Handle type="target" position={Position.Left} class="c4-handle" />
<Handle type="source" position={Position.Bottom} class="c4-handle" />
<Handle type="source" position={Position.Right} class="c4-handle" />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="c4-person-node"
  style="
    background: {bgColor};
    border-color: {borderColor};
    border-style: {isExternal ? 'dashed' : 'solid'};
  "
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <!-- Person head icon -->
  <div class="person-head" style="background: {headColor}; color: #fff;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  </div>

  <!-- Name and label -->
  <div class="person-info">
    <span class="person-name" style="color: {textColor}">{data.name}</span>
    {#if data.description}
      <span class="person-desc" style="color: {isExternal ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)'}">
        {data.description.length > 45 ? data.description.slice(0, 45) + '…' : data.description}
      </span>
    {/if}
    {#if isExternal}
      <span class="person-badge external-badge">External</span>
    {/if}
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
  .c4-person-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 14px 10px;
    border-radius: 12px;
    border-width: 1px;
    min-width: 140px;
    max-width: 160px;
    cursor: pointer;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: box-shadow 0.15s ease, transform 0.1s ease;
  }

  .c4-person-node:hover {
    box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.4);
    transform: translateY(-1px);
  }

  .person-head {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .person-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 100%;
  }

  .person-name {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }

  .person-desc {
    font-size: 9px;
    text-align: center;
    line-height: 1.4;
  }

  .person-badge {
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    border-radius: 9999px;
  }

  .external-badge {
    background: rgba(107, 114, 128, 0.25);
    color: rgba(255, 255, 255, 0.45);
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
