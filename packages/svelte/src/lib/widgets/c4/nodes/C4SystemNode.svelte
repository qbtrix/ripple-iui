<!--
  C4SystemNode.svelte — SvelteFlow node for a C4 Software System: a ringed
  card on ripple tokens (theme-aware), dashed and muted when external, with a
  drill affordance when the element is drillable. Typography follows the
  shared C4 node rules in C4Diagram (names stay legible at every zoom).
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { activateNode } from '../activate.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);
  const hasDrilldown = $derived(data.drillable ?? false);

  const handleClick = () => activateNode('system', data);
</script>

<Handle type="target" position={Position.Top} class="c4-handle" />
<Handle type="target" position={Position.Left} class="c4-handle" />
<Handle type="source" position={Position.Bottom} class="c4-handle" />
<Handle type="source" position={Position.Right} class="c4-handle" />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="c4-node c4-system-node"
  class:is-external={isExternal}
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <div class="c4-node-kind">{isExternal ? 'External System' : 'Software System'}</div>
  <div class="c4-node-name">{data.name}</div>

  {#if data.description}
    <div class="c4-node-desc">
      {data.description.length > 60 ? data.description.slice(0, 60) + '…' : data.description}
    </div>
  {/if}

  {#if data.technology}
    <div class="c4-node-tech">{data.technology}</div>
  {/if}

  {#if hasDrilldown}
    <div class="c4-node-drill" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>
