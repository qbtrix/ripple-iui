// C4 SvelteFlow node components, one per view, and C4_VIEWS: each view's component by the name
// C4Diagram registers it under (the legacy diagram uses these as SvelteFlow node types; semantic
// zoom registers C4ViewNode, which draws data.view through this same map).
import C4PersonNode from './C4PersonNode.svelte';
import C4SystemNode from './C4SystemNode.svelte';
import C4ContainerNode from './C4ContainerNode.svelte';
import C4DatabaseNode from './C4DatabaseNode.svelte';
import C4QueueNode from './C4QueueNode.svelte';
import C4ComponentNode from './C4ComponentNode.svelte';
import C4GroupNode from './C4GroupNode.svelte';
import C4CodeNode from './C4CodeNode.svelte';

export { C4PersonNode, C4SystemNode, C4ContainerNode, C4DatabaseNode, C4QueueNode, C4ComponentNode, C4GroupNode, C4CodeNode };

export const C4_VIEWS = {
  person: C4PersonNode,
  system: C4SystemNode,
  container: C4ContainerNode,
  database: C4DatabaseNode,
  queue: C4QueueNode,
  component: C4ComponentNode,
  group: C4GroupNode,
  code: C4CodeNode,
};
