<script lang="ts">
  interface Props {
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    class?: string;
  }

  let { text = '', variant = 'default', class: className }: Props = $props();
</script>

<span class="rb rb--{variant} {className ?? ''}">{text}</span>

<style>
  .rb {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
    line-height: 1.5;
    font-family: var(--ripple-font-mono);
    white-space: nowrap;
  }
  .rb--default   { color: var(--ripple-success); background: var(--ripple-success-bg); }
  .rb--success   { color: var(--ripple-success); background: var(--ripple-success-bg); }
  .rb--destructive { color: var(--ripple-danger); background: var(--ripple-danger-bg); }
  .rb--warning   { color: var(--ripple-warning); background: var(--ripple-warning-bg); }
  .rb--secondary { color: var(--ripple-text-secondary); background: var(--ripple-surface-hover); }
  .rb--outline   { color: var(--ripple-text-secondary); background: none; border: 1px solid var(--ripple-border); }
</style>
