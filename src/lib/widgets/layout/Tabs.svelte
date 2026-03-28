<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';

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
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, tabs: rawTabs = [], defaultValue, value: externalValue,
    children, onchange
  }: Props = $props();

  const tabs: Tab[] = $derived(
    rawTabs.map((t) =>
      typeof t === 'string' ? { value: t, label: t } : t
    )
  );

  let activeTab = $state(externalValue ?? defaultValue ?? '');

  $effect(() => {
    if (!activeTab && tabs.length > 0) {
      activeTab = tabs[0].value;
    }
  });

  // Sync when external value changes
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
  {#each tabs as tab (tab.value)}
    <Tabs.Content value={tab.value}>
      {#if activeTab === tab.value}
        {@render children?.()}
      {/if}
    </Tabs.Content>
  {/each}
</Tabs.Root>
