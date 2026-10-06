<!--
  C4ContainerNode.svelte — SvelteFlow node for a C4 Container: the shared
  ringed card (rules in C4Diagram), an optional KB link, and a drill
  affordance to its components. kb_article URLs go through safeKbUrl (no
  javascript:/data: schemes).
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { safeKbUrl } from '../url-sanitizer.js';

  let { data }: { data: C4NodeData } = $props();

  const hasDrilldown = $derived(data.drillable ?? false);
  const isExternal = $derived(data.external ?? false);

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
  class="c4-node c4-container-node"
  class:is-external={isExternal}
  onclick={handleClick}
  title={data.description ?? data.name}
>
  <div class="c4-node-kind">Container</div>
  <div class="c4-node-name">{data.name}</div>

  {#if data.technology}
    <div class="c4-node-tech">{data.technology}</div>
  {/if}

  {#if data.description}
    <div class="c4-node-desc">
      {data.description.length > 55 ? data.description.slice(0, 55) + '…' : data.description}
    </div>
  {/if}

  {#if safeKbUrl(data.kb_article)}
    <a
      href={safeKbUrl(data.kb_article)}
      target="_blank"
      rel="noopener noreferrer"
      class="c4-node-docs"
      onclick={(e) => e.stopPropagation()}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M12 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6M8 13h8M8 17h5"/>
      </svg>
      Docs
    </a>
  {/if}

  {#if hasDrilldown}
    <div class="c4-node-drill" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>
