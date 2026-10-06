<!--
  src/lib/widgets/data/Tree.svelte
  A recursive tree (role="tree"): expandable folders, one selected node
  (`value`, `onchange`). A registered spec widget, and on `./ui` for direct
  callers.

  Layer-panel mode (craft editors) is opt-in, one prop per feature, and none
  of it renders unless its handler is passed:
    ontogglevisible / ontogglelock: eye and lock buttons per row, reading
      node.visible / node.locked (shown on hover, pinned while off/locked).
    onrename: double-click or F2 swaps the label for an input; Enter or blur
      commits, Escape cancels.
    onreorder: rows drag (HTML5 DnD) and Alt+ArrowUp/Down move a node past
      its sibling; emits a LayerMove {id, targetId, position}. The host
      applies it and rejects a move into the node's own subtree.
  Recursion shares expansion, rename and drag state through `_expanded`,
  `_onToggle` and `_ui`; those are internal.
-->
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
    /** Layer mode: false = hidden (the eye is off). */
    visible?: boolean;
    /** Layer mode: true = locked. */
    locked?: boolean;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import * as icons from '@lucide/svelte';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import LockIcon from '@lucide/svelte/icons/lock';
  import UnlockIcon from '@lucide/svelte/icons/lock-open';
  import Self from './Tree.svelte';
  import type { LayerMove } from '../craft/types.js';

  type Id = string | number;
  /** Rename and drag state shared by every level of one tree. */
  type Shared = { editing: Id | null; dragId: Id | null; over: Id | null; pos: LayerMove['position'] | null };

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
    ontogglevisible?: (id: Id) => void;
    ontogglelock?: (id: Id) => void;
    onrename?: (id: Id, label: string) => void;
    onreorder?: (move: LayerMove) => void;
    /** Internal: shared rename/drag state passed down through recursion. */
    _ui?: Shared;
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
    onchange,
    ontogglevisible,
    ontogglelock,
    onrename,
    onreorder,
    _ui
  }: Props = $props();

  const localUi = $state<Shared>({ editing: null, dragId: null, over: null, pos: null });
  const ui = $derived(_ui ?? localUi);

  function commitRename(node: TreeNode, text: string) {
    if (ui.editing !== node.id) return;
    ui.editing = null;
    const next = text.trim();
    if (next && next !== node.label) onrename?.(node.id, next);
  }

  function focusSelect(el: HTMLInputElement) {
    el.focus();
    el.select();
  }

  function rowKey(e: KeyboardEvent, node: TreeNode, i: number) {
    if (e.key === 'F2' && onrename) {
      e.preventDefault();
      ui.editing = node.id;
    } else if (e.altKey && onreorder && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const up = e.key === 'ArrowUp';
      const sib = nodes[i + (up ? -1 : 1)];
      if (!sib) return;
      e.preventDefault();
      onreorder({ id: node.id, targetId: sib.id, position: up ? 'before' : 'after' });
    }
  }

  function dropPos(e: DragEvent, folder: boolean): LayerMove['position'] {
    const row = (e.currentTarget as HTMLElement).querySelector('[data-row]') ?? (e.currentTarget as HTMLElement);
    const r = row.getBoundingClientRect();
    const y = e.clientY - r.top;
    if (folder && y > r.height / 3 && y < (r.height * 2) / 3) return 'inside';
    return y < r.height / 2 ? 'before' : 'after';
  }

  function endDrag() {
    ui.dragId = ui.over = ui.pos = null;
  }

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
  {#each nodes as node, i (node.id)}
    {@const hasKids = !!node.children && node.children.length > 0 && !node.isLeaf}
    {@const isOpen = hasKids && expanded.has(node.id)}
    {@const isSelected = value === node.id}
    {@const NodeIcon = getIcon(node.icon)}
    {@const isHidden = node.visible === false}
    {@const isEditing = ui.editing === node.id}
    <li
      role="treeitem"
      aria-expanded={hasKids ? isOpen : undefined}
      aria-selected={isSelected}
      draggable={onreorder && !isEditing ? 'true' : undefined}
      ondragstart={onreorder
        ? (e) => {
            e.stopPropagation();
            ui.dragId = node.id;
            e.dataTransfer?.setData('text/plain', String(node.id));
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
          }
        : undefined}
      ondragover={onreorder
        ? (e) => {
            if (ui.dragId == null || ui.dragId === node.id) return;
            e.preventDefault();
            e.stopPropagation();
            ui.over = node.id;
            ui.pos = dropPos(e, hasKids);
          }
        : undefined}
      ondrop={onreorder
        ? (e) => {
            if (ui.dragId == null || ui.dragId === node.id) return;
            e.preventDefault();
            e.stopPropagation();
            onreorder?.({ id: ui.dragId, targetId: node.id, position: dropPos(e, hasKids) });
            endDrag();
          }
        : undefined}
      ondragend={onreorder ? endDrag : undefined}
    >
      <div
        data-row
        class={cn(
          'group/row flex items-center gap-0.5 rounded',
          ui.over === node.id && ui.pos === 'before' && 'shadow-[inset_0_2px_0_var(--ripple-accent)]',
          ui.over === node.id && ui.pos === 'after' && 'shadow-[inset_0_-2px_0_var(--ripple-accent)]',
          ui.over === node.id && ui.pos === 'inside' && 'bg-ripple-accent/10'
        )}
      >
      {#if isEditing}
        <input
          aria-label="Rename {node.label}"
          value={node.label}
          use:focusSelect
          onkeydown={(e) => {
            if (e.key === 'Enter') commitRename(node, e.currentTarget.value);
            else if (e.key === 'Escape') ui.editing = null;
          }}
          onblur={(e) => commitRename(node, e.currentTarget.value)}
          class="min-w-0 flex-1 rounded border border-ripple-ring bg-ripple-input px-1.5 py-0.5 text-sm text-ripple-input-foreground outline-none"
          style={`margin-left: ${_level * 12 + 6}px`}
        />
      {:else}
      <button
        type="button"
        onclick={() => {
          if (hasKids) toggle(node.id);
          select(node);
        }}
        ondblclick={onrename ? () => (ui.editing = node.id) : undefined}
        onkeydown={onrename || onreorder ? (e) => rowKey(e, node, i) : undefined}
        class={cn(
          'flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm transition-colors',
          'hover:bg-muted',
          isSelected && 'bg-primary/10 text-primary font-medium',
          isHidden && 'opacity-50'
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
      {/if}
      {#if ontogglelock}
        <button
          type="button"
          data-action="lock"
          aria-label={node.locked ? `Unlock ${node.label}` : `Lock ${node.label}`}
          aria-pressed={node.locked ? 'true' : 'false'}
          onclick={() => ontogglelock?.(node.id)}
          class={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded text-ripple-muted-foreground outline-none hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ripple-ring/60',
            !node.locked && 'opacity-0 group-hover/row:opacity-100'
          )}
        >
          {#if node.locked}<LockIcon size={12} />{:else}<UnlockIcon size={12} />{/if}
        </button>
      {/if}
      {#if ontogglevisible}
        <button
          type="button"
          data-action="visibility"
          aria-label={isHidden ? `Show ${node.label}` : `Hide ${node.label}`}
          aria-pressed={isHidden ? 'true' : 'false'}
          onclick={() => ontogglevisible?.(node.id)}
          class={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded text-ripple-muted-foreground outline-none hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ripple-ring/60',
            !isHidden && 'opacity-0 group-hover/row:opacity-100'
          )}
        >
          {#if isHidden}<EyeOffIcon size={12} />{:else}<EyeIcon size={12} />{/if}
        </button>
      {/if}
      </div>

      {#if hasKids && isOpen}
        <Self
          nodes={node.children}
          {value}
          _level={_level + 1}
          _expanded={expanded}
          _onToggle={(id) => toggle(id)}
          {onchange}
          {ontogglevisible}
          {ontogglelock}
          {onrename}
          {onreorder}
          _ui={ui}
        />
      {/if}
    </li>
  {/each}
</ul>
