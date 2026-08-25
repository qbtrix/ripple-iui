<!-- src/lib/widgets/vertical/SavedViews.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import StarIcon from '@lucide/svelte/icons/star';

  type View = {
    id: string;
    label: string;
    /** Optional icon (lucide kebab-case). */
    icon?: string;
    /** Mark as default/pinned. */
    pinned?: boolean;
    /** Optional row count badge. */
    count?: number;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    views?: View[];
    /** Selected view id. Bind via `bind: "<state-path>"`. */
    value?: string | null;
    /** Show a "+ New view" button. */
    canCreate?: boolean;
    onchange?: (id: string) => void;
    oncreate?: () => void;
  }

  let {
    id,
    class: className,
    style,
    views = [],
    value = null,
    canCreate = false,
    onchange,
    oncreate
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  role="tablist"
  class={cn('flex items-center gap-1 border-b border-border', className)}
  style={styleString}
>
  {#each views as view (view.id)}
    {@const isActive = value === view.id}
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onclick={() => onchange?.(view.id)}
      class={cn(
        'relative inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
        '-mb-px border-b-2',
        isActive
          ? 'border-primary text-foreground font-medium'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {#if view.pinned}
        <StarIcon size={12} class="text-amber-500 fill-amber-500" />
      {/if}
      <span>{view.label}</span>
      {#if typeof view.count === 'number'}
        <span class="text-xs text-muted-foreground tabular-nums rounded-full bg-muted/60 px-1.5 py-0.5">
          {view.count}
        </span>
      {/if}
    </button>
  {/each}
  {#if canCreate}
    <button
      type="button"
      onclick={() => oncreate?.()}
      class="inline-flex items-center gap-1 ml-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <PlusIcon size={14} />
      New view
    </button>
  {/if}
</div>
