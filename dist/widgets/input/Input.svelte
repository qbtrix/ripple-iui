<script lang="ts">
  interface Props {
    id?: string;
    class?: string;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, value = '', placeholder = '', type = 'text',
    disabled = false, label, onchange
  }: Props = $props();
</script>

<div class="ri-wrap {className ?? ''}">
  {#if label}<label class="ri-label" for={id}>{label}</label>{/if}
  <input {id} {type} {placeholder} {disabled} value={value ?? ''}
    class="ri" oninput={(e) => onchange?.(e.currentTarget.value)} />
</div>

<style>
  .ri-wrap { width: 100%; }
  .ri-label {
    display: block; font-size: 10px; font-weight: 500;
    color: var(--ripple-text-muted); margin-bottom: 4px;
  }
  .ri {
    width: 100%; padding: 6px 8px; border-radius: 6px;
    border: 1px solid var(--ripple-border);
    background: var(--ripple-surface);
    color: var(--ripple-text); font-size: 11px;
    outline: none; transition: border-color 0.12s;
  }
  .ri:focus { border-color: var(--ripple-ring); }
  .ri:disabled { opacity: 0.4; }
</style>
