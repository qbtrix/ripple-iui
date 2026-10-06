<!--
  C4DatabaseNode.svelte — SvelteFlow node for a database container: a
  cylinder (two elliptical caps around a body) tinted with the ripple info
  tone, text on the shared C4 node rules. kb_article URLs go through
  safeKbUrl (no javascript:/data: schemes).
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { activateNode } from '../activate.js';
  import { safeKbUrl } from '../url-sanitizer.js';

  let { data }: { data: C4NodeData } = $props();

  const hasDrilldown = $derived(data.drillable ?? false);

  const handleClick = () => activateNode('database', data);
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
  <div class="db-cap db-cap-top" aria-hidden="true"></div>

  <div class="db-body">
    <div class="c4-node-kind">Database</div>
    <div class="c4-node-name">{data.name}</div>
    {#if data.technology}
      <div class="c4-node-tech">{data.technology}</div>
    {/if}
    {#if data.description}
      <div class="c4-node-desc">
        {data.description.length > 50 ? data.description.slice(0, 50) + '…' : data.description}
      </div>
    {/if}
    {#if safeKbUrl(data.kb_article)}
      <a
        href={safeKbUrl(data.kb_article)}
        target="_blank"
        rel="noopener noreferrer"
        class="c4-node-docs"
        onclick={(e) => e.stopPropagation()}
      >Docs</a>
    {/if}
  </div>

  <div class="db-cap db-cap-bottom" aria-hidden="true"></div>

  {#if hasDrilldown}
    <div class="c4-node-drill" title="Drill down">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </div>
  {/if}
</div>

<style>
  .c4-database-node {
    --db-edge: color-mix(in oklab, var(--ripple-info) 45%, transparent);
    --db-fill: linear-gradient(color-mix(in oklab, var(--ripple-info) 12%, transparent) 0 0), var(--c4-card);
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    cursor: pointer;
    position: relative;
    color: var(--ripple-surface-foreground);
    transition: transform 150ms var(--ripple-ease-out);
  }

  .c4-database-node:hover {
    transform: translateY(-1px);
  }

  .db-cap {
    height: 18px;
    flex-shrink: 0;
    border: 1px solid var(--db-edge);
    border-radius: 50%;
    background: var(--db-fill);
  }

  .db-cap-top {
    position: relative;
    z-index: 1;
    margin-bottom: -9px;
  }

  .db-cap-bottom {
    margin-top: -9px;
  }

  .db-body {
    position: relative;
    flex: 1;
    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 12px 12px;
    border-left: 1px solid var(--db-edge);
    border-right: 1px solid var(--db-edge);
    background: var(--db-fill);
  }
</style>
