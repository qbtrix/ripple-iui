<script lang="ts">
  interface Props {
    value?: number;
    max?: number;
    class?: string;
  }

  let { value = 0, max = 100, class: className }: Props = $props();
  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="rp {className ?? ''}" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
  <div class="rp-bar" style="width: {percentage}%"></div>
</div>

<style>
  .rp {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--ripple-border);
    overflow: hidden;
  }
  .rp-bar {
    height: 100%;
    border-radius: 2px;
    background: var(--ripple-text-muted);
    transition: width 0.3s ease;
  }
</style>
