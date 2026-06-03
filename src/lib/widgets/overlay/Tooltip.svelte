<!-- src/lib/widgets/overlay/Tooltip.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Trigger as a Ripple spec node, or a plain string. Snippet children
     *  win when provided. */
    trigger?: any;
    /** Tooltip body text (text-only by design — use popover for richer content). */
    content?: string;
    side?: Side;
    align?: Align;
    /** Open delay in ms. */
    delay?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, trigger, content,
    side = 'top', align = 'center', delay = 200,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const triggerIsString = $derived(typeof trigger === 'string');
  const triggerIsSpec = $derived(
    trigger != null && typeof trigger === 'object' && !Array.isArray(trigger)
  );
</script>

<Tooltip.Provider delayDuration={delay}>
  <Tooltip.Root>
    <Tooltip.Trigger {id} class={cn(className)} style={styleString}>
      {#if hasChildren && children}
        {@render children()}
      {:else if triggerIsString}
        {trigger}
      {:else if triggerIsSpec}
        <NodeRenderer node={trigger} />
      {/if}
    </Tooltip.Trigger>
    {#if content}
      <Tooltip.Content {side} {align}>
        {content}
      </Tooltip.Content>
    {/if}
  </Tooltip.Root>
</Tooltip.Provider>
