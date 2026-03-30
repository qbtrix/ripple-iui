<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    /** Callout title (optional) */
    title?: string;
    /** Body text */
    text: string;
    /** Variant determines left border color and icon */
    variant?: 'info' | 'success' | 'warning' | 'insight';
    class?: string;
  }

  let { title, text, variant = 'info', class: className }: Props = $props();

  const config: Record<string, { border: string; bg: string; icon: string }> = {
    info:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)', icon: 'i' },
    success: { border: '#22c55e', bg: 'rgba(34,197,94,0.06)',  icon: '\u2713' },
    warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)', icon: '!' },
    insight: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', icon: '\u2726' },
  };

  const c = $derived(config[variant] ?? config.info);
</script>

<div
  class={cn('rcall', className)}
  style="border-left-color:{c.border}; background:{c.bg}"
>
  <span class="rcall-icon" style="color:{c.border}">{c.icon}</span>
  <div class="rcall-body">
    {#if title}
      <span class="rcall-title">{title}</span>
    {/if}
    <p class="rcall-text">{text}</p>
  </div>
</div>

<style>
  .rcall {
    display: flex;
    gap: 10px;
    padding: 10px 14px;
    border-left: 3px solid;
    border-radius: 0 8px 8px 0;
    align-items: flex-start;
  }
  .rcall-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    background: hsl(var(--background));
    border: 1.5px solid currentColor;
    margin-top: 1px;
  }
  .rcall-body {
    min-width: 0;
  }
  .rcall-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin-bottom: 2px;
  }
  .rcall-text {
    font-size: 12px;
    line-height: 1.5;
    color: hsl(var(--foreground) / 0.8);
    margin: 0;
  }
</style>
