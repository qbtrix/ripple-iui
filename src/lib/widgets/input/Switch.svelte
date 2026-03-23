<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Switch } from '$lib/components/ui/switch/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, checked = false,
    disabled = false, label, onchange
  }: Props = $props();

  // Local state that syncs with prop
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
    <Switch
      {id}
      checked={localChecked}
      {disabled}
      onCheckedChange={handleChange}
    />
    <label for={id} class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {label}
    </label>
  </div>
{:else}
  <Switch
    {id}
    checked={localChecked}
    {disabled}
    class={cn(className)}
    style={styleString}
    onCheckedChange={handleChange}
  />
{/if}
