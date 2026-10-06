<!--
  C4PortBadge.svelte — one aggregated connection on the C4 map: a small pill ("→ Ripple · 2")
  whose hover or keyboard focus lists the relationships behind it, through ripple's Tooltip. It
  sits at an edge's end where the edge meets an expanded boundary (C4Edge), as a chip on the scope
  boundary (C4GroupNode), and `plain` as the hover target of an aggregated edge's middle label.
  `nopan nodrag` and the click guard keep a press on it from panning the map or picking the node.
-->
<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import type { C4PortView } from './types.js';

  let { port, plain = false }: { port: C4PortView; plain?: boolean } = $props();
</script>

<Tooltip.Root delayDuration={120}>
  <Tooltip.Trigger
    class={plain ? 'c4-port c4-port-plain nopan nodrag' : 'c4-port nopan nodrag'}
    onclick={(e: MouseEvent) => e.stopPropagation()}
  >
    {port.text}
  </Tooltip.Trigger>
  <Tooltip.Content side="top" sideOffset={6}>
    <ul class="c4-port-list">
      {#each port.items as it, i (i)}
        <li>
          <span>{it.from} → {it.to}</span>
          {#if it.label}<span class="c4-port-list-label">{it.label}</span>{/if}
        </li>
      {/each}
    </ul>
  </Tooltip.Content>
</Tooltip.Root>

<style>
  /* Global: the trigger is bits-ui's button and the list is portaled out of the canvas. */
  :global(.c4-port) {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    font: inherit;
    font-size: calc(11px / clamp(0.6, var(--c4-zoom, 1), 1));
    font-weight: 500;
    line-height: 1.2;
    padding: 2px 8px;
    border-radius: 9999px;
    border: 1px solid var(--ripple-border);
    background: var(--c4-card, var(--ripple-surface));
    color: var(--ripple-surface-foreground);
    cursor: default;
    transition: border-color 150ms var(--ripple-ease-out);
  }

  :global(.c4-port:hover),
  :global(.c4-port:focus-visible) {
    border-color: color-mix(in oklab, var(--ripple-accent) 60%, transparent);
    outline: none;
  }

  :global(.c4-port.c4-port-plain) {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font-size: inherit;
  }

  :global(.c4-port-list) {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
  }

  :global(.c4-port-list li) {
    display: grid;
    gap: 1px;
  }

  :global(.c4-port-list-label) {
    opacity: 0.7;
  }
</style>
