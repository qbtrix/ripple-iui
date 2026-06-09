<!--
  Tabs.svelte — Ripple tabbed layout widget.
  Updated 2026-06-09 (reactivity): activeTab seeds once from externalValue/defaultValue
  and is then mutated locally (handleValueChange) and synced by two $effects, so it
  must stay $state. The state_referenced_locally warnings on the seed are intentional
  one-time reads, suppressed with a directive directly above the $state line.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';
  import type { UINode } from '$lib/schema/index.js';

  interface Tab {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    class?: string;
    tabs?: (Tab | string)[];
    defaultValue?: string;
    value?: string;
    children?: Snippet;
    /** Per-tab content nodes injected by NodeRenderer (one per tab, by index). */
    panels?: UINode[];
    /** Loop context to thread through NodeRenderer for per-tab content. */
    panelLoopContext?: Record<string, unknown>;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, tabs: rawTabs = [], defaultValue, value: externalValue,
    children, panels, panelLoopContext, onchange
  }: Props = $props();

  const tabs: Tab[] = $derived(
    safeArray<Tab | string>(rawTabs, { widget: 'tabs', key: 'tabs' }).map((t, i) =>
      typeof t === 'string'
        ? { value: t, label: t }
        : { value: t.value ?? t.label ?? `tab-${i}`, label: t.label ?? t.value ?? `Tab ${i + 1}` }
    )
  );

  // svelte-ignore state_referenced_locally
  let activeTab = $state(externalValue ?? defaultValue ?? '');

  $effect(() => {
    if (!activeTab && tabs.length > 0) {
      activeTab = tabs[0].value;
    }
  });

  $effect(() => {
    if (externalValue !== undefined) {
      activeTab = externalValue;
    }
  });

  function handleValueChange(newValue: string) {
    activeTab = newValue;
    onchange?.(newValue);
  }
</script>

<Tabs.Root
  {id}
  bind:value={activeTab}
  onValueChange={handleValueChange}
  class={cn('w-full', className)}
>
  <Tabs.List class="grid w-full" style="grid-template-columns: repeat({tabs.length || 1}, 1fr)">
    {#each tabs as tab (tab.value)}
      <Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
    {/each}
  </Tabs.List>
  {#each tabs as tab, i (tab.value)}
    <Tabs.Content value={tab.value}>
      {#if panels && panels[i]}
        <NodeRenderer node={panels[i]} loopContext={panelLoopContext ?? {}} />
      {:else if activeTab === tab.value}
        {@render children?.()}
      {/if}
    </Tabs.Content>
  {/each}
</Tabs.Root>
