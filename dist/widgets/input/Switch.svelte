<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    id?: string;
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
  }

  let { id, class: className, checked = false, disabled = false, label, onchange }: Props = $props();
</script>

<label class={cn('ripple-switch-wrapper', className)}>
  <button {id} type="button" role="switch" aria-checked={checked} {disabled}
    class={cn('ripple-switch', checked && 'ripple-switch--checked')}
    onclick={() => onchange?.(!checked)}>
    <span class="ripple-switch-thumb" data-state={checked ? 'checked' : 'unchecked'}></span>
  </button>
  {#if label}<span class="ripple-switch-label">{label}</span>{/if}
</label>
