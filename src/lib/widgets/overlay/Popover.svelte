<!-- src/lib/widgets/overlay/Popover.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    trigger?: any;
    content?: any;
    side?: Side;
    align?: Align;
    open?: boolean;
    onopenchange?: (open: boolean) => void;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, trigger, content,
    side = 'bottom', align = 'center', open = $bindable(false), onopenchange,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function isString(v: unknown): v is string {
    return typeof v === 'string';
  }
  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v);
  }
</script>

<Popover.Root bind:open onOpenChange={onopenchange}>
  <Popover.Trigger {id} class={cn(className)} style={styleString}>
    {#if hasChildren && children}
      {@render children()}
    {:else if isString(trigger)}
      {trigger}
    {:else if isSpec(trigger)}
      <NodeRenderer node={trigger} />
    {/if}
  </Popover.Trigger>
  <Popover.Content {side} {align}>
    {#if isString(content)}
      <p class="text-sm">{content}</p>
    {:else if isSpec(content)}
      <NodeRenderer node={content} />
    {/if}
  </Popover.Content>
</Popover.Root>
