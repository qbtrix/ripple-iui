<!--
  C4QueueNode.svelte — SvelteFlow node for a message queue container: a
  parallelogram (clip-path) tinted with the ripple warning tone, text on the
  shared C4 node rules. kb_article URLs go through safeKbUrl (no
  javascript:/data: schemes).
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
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
  <div class="queue-shape">
    <div class="c4-node-kind">Message Queue</div>
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
</div>

<style>
  .c4-queue-node {
    min-width: 180px;
    max-width: 200px;
    cursor: pointer;
    position: relative;
    color: var(--ripple-surface-foreground);
    transition: transform 150ms var(--ripple-ease-out);
  }

  .c4-queue-node:hover {
    transform: translateY(-1px);
  }

  .queue-shape {
    background: linear-gradient(color-mix(in oklab, var(--ripple-warning) 16%, transparent) 0 0), var(--c4-card);
    clip-path: polygon(16px 0%, 100% 0%, calc(100% - 16px) 100%, 0% 100%);
    padding: 12px 26px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
</style>
