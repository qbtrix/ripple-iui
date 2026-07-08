<!-- Updated 2026-07-08: typed getIcon's Lucide lookup as a Svelte Component (was unknown → narrowed to {} at the render slot, failing svelte-check). -->
<!-- src/lib/widgets/data/Tree.svelte -->
<script module lang="ts">
  // Public type — module scope so svelte-package emits it in the
  // generated .d.ts. Without this, `export type` inside the
  // per-instance <script> block isn't reachable from the module's
  // d.ts surface and svelte-package fails the build.
  export type TreeNode = {
    id: string | number;
    label: string;
    icon?: string;
    description?: string;
    children?: TreeNode[];
    /** Mark as a folder/leaf explicitly. Defaults: leaf if no children. */
    isLeaf?: boolean;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import * as icons from '@lucide/svelte';
  import Self from './Tree.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    nodes?: TreeNode[];
    /** Selected node id. Bind via `bind: "<state-path>"`. */
    value?: string | number | null;
    /** Initial expansion: 'none' | 'first-level' | 'all'. */
    defaultExpanded?: 'none' | 'first-level' | 'all';
    /** Internal nesting level — set automatically by recursion. */
    _level?: number;
    /** Set of expanded ids passed down through recursion. */
    _expanded?: Set<string | number>;
    /** Toggle handler shared across the tree. */
    _onToggle?: (id: string | number) => void;
    onchange?: (value?: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    nodes: rawNodes = [],
    value = null,
    defaultExpanded = 'first-level',
    _level = 0,
    _expanded,
    _onToggle,
    onchange
  }: Props = $props();

  const nodes = $derived(safeArray<TreeNode>(rawNodes, { widget: 'tree', key: 'nodes' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Root-level state: shared across the whole subtree via prop drilling.
  let rootExpanded = $state<Set<string | number>>(new Set());
  let initialized = $state(false);

  $effect(() => {
    if (initialized || _expanded) return;
    const next = new Set<string | number>();
    if (defaultExpanded === 'all') {
      const collect = (ns: TreeNode[]) => {
        for (const n of ns) {
          if (n.children?.length) {
            next.add(n.id);
            collect(n.children);
          }
        }
      };
      collect(nodes);
    } else if (defaultExpanded === 'first-level') {
      for (const n of nodes) if (n.children?.length) next.add(n.id);
    }
    rootExpanded = next;
    initialized = true;
  });

  const expanded = $derived(_expanded ?? rootExpanded);

  function toggle(nodeId: string | number) {
    if (_onToggle) {
      _onToggle(nodeId);
      return;
    }
    const next = new Set(rootExpanded);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    rootExpanded = next;
  }

  function select(node: TreeNode) {
    onchange?.(node.id);
  }

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  const isRoot = $derived(_level === 0);
</script>

<ul
  {id}
  role={isRoot ? 'tree' : 'group'}
  class={cn(
    isRoot && 'list-none p-2 m-0 rounded-md border border-border bg-card/30',
    !isRoot && 'list-none m-0 p-0',
    className
  )}
  style={styleString}
>
  {#each nodes as node (node.id)}
    {@const hasKids = !!node.children && node.children.length > 0 && !node.isLeaf}
    {@const isOpen = hasKids && expanded.has(node.id)}
    {@const isSelected = value === node.id}
    {@const NodeIcon = getIcon(node.icon)}
    <li role="treeitem" aria-expanded={hasKids ? isOpen : undefined} aria-selected={isSelected}>
      <button
        type="button"
        onclick={() => {
          if (hasKids) toggle(node.id);
          select(node);
        }}
        class={cn(
          'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm transition-colors',
          'hover:bg-muted',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={`padding-left: ${_level * 12 + 6}px`}
      >
        {#if hasKids}
          <span class="opacity-60 shrink-0">
            {#if isOpen}
              <ChevronDownIcon size={14} />
            {:else}
              <ChevronRightIcon size={14} />
            {/if}
          </span>
        {:else}
          <span class="w-3.5 shrink-0"></span>
        {/if}
        {#if NodeIcon}<NodeIcon size={14} class="opacity-70 shrink-0" />{/if}
        <span class="flex-1 min-w-0 truncate">{node.label}</span>
        {#if node.description}
          <span class="text-xs text-muted-foreground shrink-0">{node.description}</span>
        {/if}
      </button>

      {#if hasKids && isOpen}
        <Self
          nodes={node.children}
          {value}
          _level={_level + 1}
          _expanded={expanded}
          _onToggle={(id) => toggle(id)}
          {onchange}
        />
      {/if}
    </li>
  {/each}
</ul>
