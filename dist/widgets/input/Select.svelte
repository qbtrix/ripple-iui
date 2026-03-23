<script lang="ts">
  import { cn } from '../../utils.js';
  import * as Select from '../../components/ui/select/index.js';

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

  const normalizedOptions = $derived(
    options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  );

  const selectedLabel = $derived(
    normalizedOptions.find(o => o.value === value)?.label ?? placeholder
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleChange(newValue: string | undefined) {
    if (newValue !== undefined) {
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
    {value}
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
