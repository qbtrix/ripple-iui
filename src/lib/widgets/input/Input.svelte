<script lang="ts">
  import { cn } from '../../utils.js';

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

<div class={cn('ripple-input-wrapper', className)}>
  {#if label}<label class="ripple-input-label" for={id}>{label}</label>{/if}
  <input {id} {type} {placeholder} {disabled} value={value ?? ''}
    class="ripple-input" oninput={(e) => onchange?.(e.currentTarget.value)} />
</div>
