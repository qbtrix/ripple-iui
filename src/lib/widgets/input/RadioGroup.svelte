<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import * as RadioGroup from '$lib/components/ui/radio-group/index.js';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    value?: string;
    options?: (string | Option)[];
    disabled?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, label, value = '',
    options = [], disabled = false, onchange
  }: Props = $props();

  const normalized: Option[] = $derived(
    canonicalOptions(options, { widget: 'radio-group', key: 'options' }).map((o) => ({
      value: String(o.value),
      label: o.label
    }))
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleChange(v: string) {
    onchange?.(v);
  }
</script>

<div class={cn('flex flex-col gap-2', className)} style={styleString} {id}>
  {#if label}
    <span class="text-sm font-medium leading-none">{label}</span>
  {/if}
  <RadioGroup.Root
    {value}
    {disabled}
    onValueChange={handleChange}
  >
    {#each normalized as opt (opt.value)}
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <RadioGroup.Item value={opt.value} />
        <span>{opt.label}</span>
      </label>
    {/each}
  </RadioGroup.Root>
</div>
