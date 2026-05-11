<!-- src/lib/widgets/vertical/OrgChart.svelte -->
<script module lang="ts">
  // Public type — module scope so svelte-package emits it in the
  // generated .d.ts.
  export type Node = {
    id: string | number;
    name: string;
    title?: string;
    avatar?: string;
    children?: Node[];
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Self from './OrgChart.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Single root node (use a virtual root if you have multiple top-level reports). */
    root?: Node | null;
    /** Internal — do not set when using as a root. */
    _isRoot?: boolean;
    /** Selected node id. */
    value?: string | number | null;
    onchange?: (id: string | number) => void;
  }

  let {
    id,
    class: className,
    style,
    root = null,
    _isRoot = true,
    value = null,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

{#if root}
  {#if _isRoot}
    <div
      {id}
      class={cn('overflow-x-auto p-4', className)}
      style={styleString}
    >
      <Self {root} _isRoot={false} {value} {onchange} />
    </div>
  {:else}
    {@const isSelected = value === root.id}
    {@const kids = root.children ?? []}
    <div class="inline-flex flex-col items-center gap-3 px-2">
      <button
        type="button"
        onclick={() => onchange?.(root.id)}
        class={cn(
          'inline-flex flex-col items-center gap-1.5 rounded-lg border bg-card px-3 py-2 min-w-[120px] transition-colors',
          isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
        )}
      >
        {#if root.avatar}
          <img src={root.avatar} alt="" class="h-9 w-9 rounded-full object-cover" />
        {:else}
          <span class="h-9 w-9 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center">
            {initials(root.name)}
          </span>
        {/if}
        <span class="text-sm font-medium leading-tight">{root.name}</span>
        {#if root.title}
          <span class="text-[11px] text-muted-foreground leading-tight">{root.title}</span>
        {/if}
      </button>

      {#if kids.length > 0}
        <span class="block w-px h-3 bg-border" aria-hidden="true"></span>
        <div class="relative flex items-start gap-2">
          {#if kids.length > 1}
            <span
              aria-hidden="true"
              class="absolute top-0 left-3 right-3 h-px bg-border"
            ></span>
          {/if}
          {#each kids as kid (kid.id)}
            <div class="flex flex-col items-center gap-3">
              <span class="block w-px h-3 bg-border" aria-hidden="true"></span>
              <Self root={kid} _isRoot={false} {value} {onchange} />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
{/if}
