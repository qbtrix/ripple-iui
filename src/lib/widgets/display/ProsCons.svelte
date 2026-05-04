<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    pros?: string[];
    cons?: string[];
    prosLabel?: string;
    consLabel?: string;
  }

  let {
    id, class: className, style,
    pros = [], cons = [],
    prosLabel = 'Pros', consLabel = 'Cons'
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn('grid gap-4 md:grid-cols-2', className)}
  style={styleString}
>
  <div class="rounded-md border border-border p-3">
    <div class="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ripple-success">
      <CheckIcon size={14} />
      <span>{prosLabel}</span>
    </div>
    <ul class="flex flex-col gap-1.5 text-sm">
      {#each pros as p}
        <li class="flex items-start gap-2">
          <CheckIcon size={14} class="mt-0.5 shrink-0 text-ripple-success" />
          <span>{p}</span>
        </li>
      {/each}
    </ul>
  </div>
  <div class="rounded-md border border-border p-3">
    <div class="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ripple-error">
      <XIcon size={14} />
      <span>{consLabel}</span>
    </div>
    <ul class="flex flex-col gap-1.5 text-sm">
      {#each cons as c}
        <li class="flex items-start gap-2">
          <XIcon size={14} class="mt-0.5 shrink-0 text-ripple-error" />
          <span>{c}</span>
        </li>
      {/each}
    </ul>
  </div>
</div>
