<script lang="ts">
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

<div class="rs-wrap {className ?? ''}">
  {#if label}<label class="rs-label" for={id}>{label}</label>{/if}
  <select {id} {disabled} class="rs" onchange={(e) => onchange?.(e.currentTarget.value)}>
    {#if placeholder}<option value="" disabled selected={!value}>{placeholder}</option>{/if}
    {#each normalizedOptions as opt}
      <option value={opt.value} selected={value === opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>

<style>
  .rs-wrap { width: 100%; }
  .rs-label {
    display: block; font-size: 10px; font-weight: 500;
    color: var(--ripple-text-muted); margin-bottom: 4px;
  }
  .rs {
    width: 100%; padding: 6px 8px; border-radius: 6px;
    border: 1px solid var(--ripple-border);
    background: var(--ripple-surface);
    color: var(--ripple-text); font-size: 11px;
    outline: none; transition: border-color 0.12s;
    appearance: auto;
  }
  .rs:focus { border-color: var(--ripple-ring); }
</style>
