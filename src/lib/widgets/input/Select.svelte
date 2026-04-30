<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Select from '$lib/components/ui/select/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string;
    placeholder?: string;
    options?: (string | { value: string; label: string })[];
    label?: string;
    disabled?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, value = '', placeholder = 'Select...',
    options = [], label, disabled = false, onchange
  }: Props = $props();

  // Mirror value into a local $state so the inner shadcn Select (which uses
  // `bind:value` on the bits-ui primitive) can round-trip user picks. Without
  // this, picking an option leaves bits-ui's internal state ahead of our
  // upstream prop and onValueChange fires correctly but the trigger drifts.
  let internalValue = $state(value);
  $effect(() => {
    if (value !== internalValue) internalValue = value;
  });

  const normalizedOptions = $derived(
    options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  );

  const selectedLabel = $derived(
    normalizedOptions.find(o => o.value === internalValue)?.label ?? placeholder
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleChange(newValue: string | undefined) {
    if (newValue !== undefined) {
      internalValue = newValue;
      onchange?.(newValue);
    }
  }
</script>

<div class="space-y-2">
  {#if label}
    <span class="text-sm font-medium leading-none">
      {label}
    </span>
  {/if}
  <Select.Root
    type="single"
    bind:value={internalValue}
    onValueChange={handleChange}
    {disabled}
  >
    <Select.Trigger {id} class={cn('w-full', className)} style={styleString}>
      {selectedLabel}
    </Select.Trigger>
    <Select.Content>
      {#each normalizedOptions as option}
        <Select.Item value={option.value}>
          {option.label}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
