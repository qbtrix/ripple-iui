<!--
  C4PersonNode.svelte — SvelteFlow node for a C4 Person: the shared ringed
  card (rules in C4Diagram) under an avatar disc tinted with the accent, or
  muted and dashed when the person is external.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);
  const hasDrilldown = $derived(data.drillable ?? false);

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
  class="c4-node c4-person-node"
  class:is-external={isExternal}
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <div class="person-head" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  </div>

  <div class="c4-node-name">{data.name}</div>
  {#if data.description}
    <div class="c4-node-desc">
      {data.description.length > 45 ? data.description.slice(0, 45) + '…' : data.description}
    </div>
  {/if}
  {#if isExternal}
    <span class="c4-node-tech">External</span>
  {/if}

  {#if hasDrilldown}
    <div class="c4-node-drill" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>

<style>
  .person-head {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--ripple-accent);
    background: color-mix(in oklab, var(--ripple-accent) 14%, transparent);
  }

  .is-external .person-head {
    color: var(--ripple-muted-foreground);
    background: var(--ripple-muted);
  }
</style>
