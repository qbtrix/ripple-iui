<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Tab {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    class?: string;
    tabs?: Tab[];
    defaultValue?: string;
    value?: string;
    children?: Snippet;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, tabs = [], defaultValue, value: externalValue,
    children, onchange
  }: Props = $props();

  let activeTab = $state(externalValue ?? defaultValue ?? tabs[0]?.value ?? '');

  function selectTab(val: string) {
    activeTab = val;
    onchange?.(val);
  }
</script>

<div {id} class={cn('ripple-tabs', className)}>
  <div class="ripple-tabs-list" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.value}
        data-state={activeTab === tab.value ? 'active' : 'inactive'}
        class="ripple-tabs-trigger"
        onclick={() => selectTab(tab.value)}
      >
        {tab.label}
      </button>
    {/each}
  </div>
  <div class="ripple-tabs-content" data-value={activeTab}>
    {@render children?.()}
  </div>
</div>
