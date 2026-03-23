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

<label class="rsw-wrap {className ?? ''}">
  <button {id} type="button" role="switch" aria-checked={checked} {disabled}
    class="rsw" class:rsw--on={checked}
    onclick={() => onchange?.(!checked)}>
    <span class="rsw-thumb"></span>
  </button>
  {#if label}<span class="rsw-label">{label}</span>{/if}
</label>

<style>
  .rsw-wrap {
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
    font-size: 11px; color: var(--ripple-text-secondary);
  }
  .rsw {
    width: 34px; height: 18px; border-radius: 9px; padding: 2px;
    border: none; cursor: pointer;
    background: var(--ripple-surface-hover);
    transition: background 0.15s;
    display: flex; align-items: center;
  }
  .rsw--on { background: var(--ripple-success); }
  .rsw-thumb {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--ripple-text);
    transition: transform 0.15s;
    display: block;
  }
  .rsw--on .rsw-thumb { transform: translateX(16px); }
  .rsw:disabled { opacity: 0.35; cursor: not-allowed; }
  .rsw-label { user-select: none; }
</style>
