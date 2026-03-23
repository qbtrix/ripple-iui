<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    onclick?: () => void;
  }

  let {
    id, class: className, style, label, children, hasChildren = false,
    variant = 'default', size = 'default', disabled = false, onclick
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<button {id} {disabled} class="rbtn rbtn--{variant} rbtn--{size} {className ?? ''}" style={styleString} onclick={onclick}>
  {#if hasChildren}{@render children?.()}{:else}{label || 'Button'}{/if}
</button>

<style>
  .rbtn {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 6px; font-size: 11px; font-weight: 500;
    border: none; cursor: pointer;
    transition: background 0.12s, opacity 0.12s;
    padding: 6px 12px;
  }
  .rbtn--sm { padding: 4px 8px; font-size: 10px; }
  .rbtn--lg { padding: 8px 16px; font-size: 13px; }
  .rbtn--default { background: var(--ripple-surface-hover); color: var(--ripple-text); }
  .rbtn--default:hover { background: var(--ripple-ring); }
  .rbtn--outline { background: none; color: var(--ripple-text-secondary); border: 1px solid var(--ripple-border); }
  .rbtn--outline:hover { background: var(--ripple-surface); }
  .rbtn--ghost { background: none; color: var(--ripple-text-secondary); }
  .rbtn--ghost:hover { background: var(--ripple-surface); }
  .rbtn--secondary { background: var(--ripple-surface); color: var(--ripple-text-secondary); }
  .rbtn--destructive { background: var(--ripple-danger-bg); color: var(--ripple-danger); }
  .rbtn--destructive:hover { background: rgba(255, 69, 58, 0.20); }
  .rbtn--link { background: none; color: var(--ripple-info); padding: 0; text-decoration: underline; }
  .rbtn:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
