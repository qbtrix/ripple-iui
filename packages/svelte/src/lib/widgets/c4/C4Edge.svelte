<!--
  C4Edge.svelte — the SvelteFlow edge for a C4 relationship that ELK routed: an orthogonal polyline
  through ELK's points with rounded corners, and the label at the box ELK reserved for it (beside
  the line, clear of nodes). C4Diagram only uses it when a route exists; otherwise edges stay
  smoothstep.

  Semantic zoom adds two things through `data`: `items` (the relationships an aggregated edge
  stands for), which turns the middle label into a hover target listing them, and `tail` / `head`
  port badges where the edge meets an expanded boundary. A ghosted edge (both ends outside the
  scope) dims its labels with it. Without them the edge renders as it always did.
-->
<script lang="ts">
  import { BaseEdge, EdgeLabel, type EdgeProps } from '@xyflow/svelte';
  import C4PortBadge from './C4PortBadge.svelte';
  import { roundedPath } from './live.js';
  import type { C4PortView } from './types.js';

  type Point = { x: number; y: number };
  type Box = Point & { width: number; height: number };
  type Badge = { box: Box; text: string };

  let { id, data, label, style, markerEnd, interactionWidth }: EdgeProps = $props();

  const points = $derived((data?.points as Point[] | undefined) ?? []);
  const box = $derived(data?.labelBox as Box | undefined);
  const items = $derived(data?.items as C4PortView['items'] | undefined);
  const tail = $derived(data?.tail as Badge | undefined);
  const head = $derived(data?.head as Badge | undefined);
  const ghost = $derived(!!data?.ghost);
  // ELK's label box when it gave one, else the route's middle point.
  const at = $derived(
    box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : points[Math.floor(points.length / 2)]
  );
  const centre = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
</script>

<BaseEdge
  {id}
  path={roundedPath(points, 8)}
  {style}
  {markerEnd}
  {interactionWidth}
  label={items ? undefined : label}
  labelX={at?.x}
  labelY={at?.y}
/>

{#if items && label && at}
  <EdgeLabel x={at.x} y={at.y} class={ghost ? 'c4-ghost-label' : undefined}>
    <C4PortBadge port={{ text: String(label), items }} plain />
  </EdgeLabel>
{/if}

{#each [tail, head] as badge, i (i)}
  {#if badge && items}
    <EdgeLabel
      x={centre(badge.box).x}
      y={centre(badge.box).y}
      class={ghost ? 'c4-badge-label c4-ghost-label' : 'c4-badge-label'}
    >
      <C4PortBadge port={{ text: badge.text, items }} />
    </EdgeLabel>
  {/if}
{/each}
