<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    id?: string;
    class?: string;
    value?: string;
    placeholder?: string;
    options?: (string | { value: string; label: string })[];
    label?: string;
    disabled?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, value = '', placeholder = 'Select...',
    options = [], label, disabled = false, onchange
  }: Props = $props();

  const normalizedOptions = $derived(
    options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  );
</script>

<div class={cn('ripple-select-wrapper', className)}>
  {#if label}<label class="ripple-select-label" for={id}>{label}</label>{/if}
  <select {id} {disabled} class="ripple-select"
    onchange={(e) => onchange?.(e.currentTarget.value)}>
    {#if placeholder}<option value="" disabled selected={!value}>{placeholder}</option>{/if}
    {#each normalizedOptions as opt}
      <option value={opt.value} selected={value === opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
