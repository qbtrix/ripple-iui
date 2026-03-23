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

<label class={cn('ripple-checkbox-wrapper', className)}>
  <input {id} type="checkbox" {checked} {disabled} class="ripple-checkbox"
    onchange={(e) => onchange?.(e.currentTarget.checked)} />
  {#if label}<span class="ripple-checkbox-label">{label}</span>{/if}
</label>
