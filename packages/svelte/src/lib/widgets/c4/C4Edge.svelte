<!--
  C4Edge.svelte — the SvelteFlow edge for a C4 relationship that ELK routed:
  an orthogonal polyline through ELK's points with rounded corners, and the
  label at the box ELK reserved for it (beside the line, clear of nodes).
  C4Diagram only uses it when a route exists; otherwise edges stay smoothstep.
-->
<script lang="ts">
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { roundedPath } from './live.js';

  type Point = { x: number; y: number };
  type Box = Point & { width: number; height: number };

  let { id, data, label, style, markerEnd, interactionWidth }: EdgeProps = $props();

  const points = $derived((data?.points as Point[] | undefined) ?? []);
  const box = $derived(data?.labelBox as Box | undefined);
  // ELK's label box when it gave one, else the route's middle point.
  const at = $derived(
    box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : points[Math.floor(points.length / 2)]
  );
</script>

<BaseEdge
  {id}
  path={roundedPath(points, 8)}
  {style}
  {markerEnd}
  {interactionWidth}
  {label}
  labelX={at?.x}
  labelY={at?.y}
/>
