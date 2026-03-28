<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface TimelineEvent {
    /** Date or time label */
    date: string;
    /** Event title */
    title: string;
    /** Optional detail text */
    detail?: string;
    /** Dot color or event type */
    type?: 'default' | 'success' | 'warning' | 'error' | 'info';
    /** Custom dot color */
    color?: string;
  }

  interface Props {
    events: TimelineEvent[];
    /** Max events to show before truncating */
    maxItems?: number;
    class?: string;
  }

  let { events = [], maxItems, class: className }: Props = $props();

  const visible = $derived(maxItems ? events.slice(0, maxItems) : events);

  const typeColors: Record<string, string> = {
    default: 'hsl(var(--muted-foreground))',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };

  function dotColor(ev: TimelineEvent): string {
    if (ev.color) return ev.color;
    return typeColors[ev.type ?? 'default'];
  }
</script>

<div class={cn('rtl', className)}>
  {#each visible as ev, i}
    <div class="rtl-item">
      <div class="rtl-rail">
        <span class="rtl-dot" style="background:{dotColor(ev)}"></span>
        {#if i < visible.length - 1}
          <span class="rtl-line"></span>
        {/if}
      </div>
      <div class="rtl-content">
        <span class="rtl-date">{ev.date}</span>
        <span class="rtl-title">{ev.title}</span>
        {#if ev.detail}
          <p class="rtl-detail">{ev.detail}</p>
        {/if}
      </div>
    </div>
  {/each}
  {#if maxItems && events.length > maxItems}
    <div class="rtl-more">+{events.length - maxItems} more</div>
  {/if}
</div>

<style>
  .rtl {
    display: flex;
    flex-direction: column;
  }
  .rtl-item {
    display: flex;
    gap: 12px;
    min-height: 0;
  }
  .rtl-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 12px;
    flex-shrink: 0;
    padding-top: 4px;
  }
  .rtl-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px hsl(var(--card));
  }
  .rtl-line {
    width: 1.5px;
    flex: 1;
    background: hsl(var(--border));
    min-height: 12px;
  }
  .rtl-content {
    padding-bottom: 16px;
    min-width: 0;
  }
  .rtl-date {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
  }
  .rtl-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--foreground));
    line-height: 1.35;
  }
  .rtl-detail {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
    line-height: 1.45;
    margin: 3px 0 0;
  }
  .rtl-more {
    font-size: 11px;
    color: hsl(var(--muted-foreground));
    padding-left: 24px;
    font-weight: 500;
  }
</style>
