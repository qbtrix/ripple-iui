<!--
  C4GroupNode.svelte — SvelteFlow parent node for a C4 boundary: the dashed box
  that nests the next level down (a system's containers, or with `kind` a
  container's components or a component's code). Its corner label names the
  boundary's kind and is the clickable part; the box itself lets pointer
  events through to the pane so the canvas still pans from inside it. In
  semantic zoom the scope boundary also lists its far connections as chips at
  the right of the label row (C4PortBadge), and a frame fades in when a card
  opens into it.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import C4PortBadge from '../C4PortBadge.svelte';
  import { kindLabel } from '../semantic.js';

  let { data }: { data: C4NodeData } = $props();

  const isExternal = $derived(data.external ?? false);
  const label = $derived(kindLabel({ kind: data.kind, external: isExternal }));

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

<div class="c4-group-node" class:is-external={isExternal}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="group-label" onclick={handleClick} title={data.description ?? data.name}>
    <span class="group-type">{label}</span>
    <span class="group-name">{data.name}</span>
    {#if data.technology}
      <span class="group-tech">{data.technology}</span>
    {/if}
    {#if data.ports?.length}
      <span class="group-ports">
        {#each data.ports as port, i (i)}
          <C4PortBadge {port} />
        {/each}
      </span>
    {/if}
  </div>
</div>

<style>
  .c4-group-node {
    /* SvelteFlow sizes the wrapper from the ELK layout; fill it. */
    width: 100%;
    height: 100%;
    border-radius: 12px;
    border: 1px dashed color-mix(in oklab, var(--ripple-surface-foreground) 24%, transparent);
    background: color-mix(in oklab, var(--ripple-surface-foreground) 2.5%, transparent);
    position: relative;
    pointer-events: none;
  }

  /* Only on the semantic canvas, where a card opens into this frame in place. */
  :global(.c4-semantic) .c4-group-node {
    animation: c4-frame-in 360ms var(--ripple-ease-out) both;
  }

  @keyframes c4-frame-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.c4-semantic) .c4-group-node {
      animation: none;
    }
  }

  .group-ports {
    margin-left: auto;
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .c4-group-node.is-external {
    border-color: var(--ripple-border);
  }

  .group-label {
    position: absolute;
    top: 10px;
    left: 14px;
    right: 14px;
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    pointer-events: auto;
    cursor: pointer;
  }

  .group-type {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ripple-muted-foreground);
  }

  .group-name {
    font-size: calc(13px / clamp(0.5, var(--c4-zoom, 1), 1));
    font-weight: 600;
    letter-spacing: -0.005em;
    color: var(--ripple-surface-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .group-tech {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--ripple-muted-foreground);
  }

  :global(.svelte-flow[data-c4-far]) .group-type,
  :global(.svelte-flow[data-c4-far]) .group-tech {
    display: none;
  }
</style>
