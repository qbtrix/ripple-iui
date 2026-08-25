<!-- Updated: 2026-06-02 — pass a `name` to Select.Root so bits-ui renders a
     hidden form input; a static <form action> POST then submits the selected
     value with JS off (ripple-iui #54).
     Updated: 2026-06-09 — svelte-ignore state_referenced_locally on the
     internalValue seed: it's intentionally mutated by handleChange/bind:value +
     synced by an $effect (controlled input with internal state), stays $state. -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
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
    /** Field name for native form submission. Defaults to the bind path via NodeRenderer. */
    name?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, value = '', placeholder = 'Select...',
    options = [], label, disabled = false, name, onchange
  }: Props = $props();

  // Mirror value into a local $state so the inner shadcn Select (which uses
  // `bind:value` on the bits-ui primitive) can round-trip user picks. Without
  // this, picking an option leaves bits-ui's internal state ahead of our
  // upstream prop and onValueChange fires correctly but the trigger drifts.
  // svelte-ignore state_referenced_locally
  let internalValue = $state(value);
  $effect(() => {
    if (value !== internalValue) internalValue = value;
  });

  // Accept the canonical `{value, label}` shape AND the common alias
  // shapes a data source might return (e.g. `workspace.members` →
  // `{id, name, email, ...}`). See `canonicalOptions` for the full
  // alias-key list.
  const normalizedOptions = $derived(
    canonicalOptions(options, { widget: 'select', key: 'options' })
  );

  const selectedLabel = $derived(
    normalizedOptions.find(o => String(o.value) === String(internalValue))?.label ?? placeholder
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
    {name}
  >
    <Select.Trigger {id} class={cn('w-full', className)} style={styleString}>
      {selectedLabel}
    </Select.Trigger>
    <Select.Content>
      {#each normalizedOptions as option}
        <Select.Item value={String(option.value)}>
          {option.label}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
