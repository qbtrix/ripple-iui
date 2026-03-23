<script lang="ts">
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

<label class="rc-wrap {className ?? ''}">
  <input {id} type="checkbox" {checked} {disabled} class="rc"
    onchange={(e) => onchange?.(e.currentTarget.checked)} />
  {#if label}<span class="rc-label">{label}</span>{/if}
</label>

<style>
  .rc-wrap {
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
    font-size: 11px; color: var(--ripple-text-secondary);
  }
  .rc {
    width: 14px; height: 14px; border-radius: 3px;
    accent-color: var(--ripple-info);
    cursor: pointer;
  }
  .rc-label { user-select: none; }
</style>
