<!-- src/lib/widgets/vertical/SettingsList.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Item = {
    id?: string;
    label: string;
    description?: string;
    /** UINode rendered on the right side of the row (input, switch, button, etc.). */
    control?: any;
    /** Optional group heading — items with the same group are clustered. */
    group?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items?: Item[];
    children?: Snippet;
  }

  let {
    id,
    class: className,
    style,
    items = [],
    children
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }

  // Group items preserving insertion order.
  const grouped = $derived.by(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const g = it.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    }
    return Array.from(map.entries());
  });
</script>

<div
  {id}
  class={cn('flex flex-col gap-6', className)}
  style={styleString}
>
  {#each grouped as [group, list] (group)}
    <div class="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
      {#if group}
        <div class="px-4 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {group}
        </div>
      {/if}
      {#each list as item, i (item.id ?? i)}
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium">{item.label}</div>
            {#if item.description}
              <div class="text-xs text-muted-foreground mt-0.5">{item.description}</div>
            {/if}
          </div>
          {#if isSpec(item.control)}
            <div class="shrink-0">
              <NodeRenderer node={item.control} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
  {@render children?.()}
</div>
