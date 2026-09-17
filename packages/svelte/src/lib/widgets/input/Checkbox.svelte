<!-- Updated: 2026-06-02 — pass a `name` to the bits-ui checkbox so it renders a
     hidden form input; a static <form action> POST then submits the checked
     state with JS off (ripple-iui #54).
     Updated: 2026-06-09 — svelte-ignore state_referenced_locally on the
     localChecked seed: it's intentionally mutated by handleChange + synced by
     an $effect (controlled input with internal state), so it stays $state. -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    /** Field name for native form submission. Defaults to the bind path via NodeRenderer. */
    name?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, checked = false,
    disabled = false, label, name, onchange
  }: Props = $props();

  // Local state that syncs with prop
  // svelte-ignore state_referenced_locally
  let localChecked = $state(checked);

  $effect(() => {
    localChecked = checked;
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleChange(value: boolean) {
    localChecked = value;
    onchange?.(value);
  }
</script>

{#if label}
  <div class={cn('flex items-center gap-2', className)} style={styleString}>
    <Checkbox
      {id}
      {name}
      checked={localChecked}
      {disabled}
      onCheckedChange={handleChange}
    />
    <label for={id} class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {label}
    </label>
  </div>
{:else}
  <Checkbox
    {id}
    {name}
    checked={localChecked}
    {disabled}
    class={cn(className)}
    style={styleString}
    onCheckedChange={handleChange}
  />
{/if}
