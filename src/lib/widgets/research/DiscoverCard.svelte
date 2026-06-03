<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    /** Card image URL */
    image?: string;
    /** Card title */
    title: string;
    /** Short description */
    description?: string;
    /** Source/publisher name */
    source?: string;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
  }

  let {
    image, title, description, source,
    url, class: className, onclick
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class={cn('rdisc', className)}
  onclick={onclick ?? (url ? () => window.open(url, '_blank') : undefined)}
  role={onclick || url ? 'button' : undefined}
  tabindex={onclick || url ? 0 : undefined}
>
  {#if image}
    <div class="rdisc-img-wrap">
      <img src={image} alt={title} class="rdisc-img" />
    </div>
  {/if}
  <div class="rdisc-body">
    <p class="rdisc-title">{title}</p>
    {#if description}
      <p class="rdisc-desc">{description}</p>
    {/if}
    {#if source}
      <span class="rdisc-source">{source}</span>
    {/if}
  </div>
</div>

<style>
  .rdisc {
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--card);
    min-width: 180px;
    max-width: 240px;
    flex-shrink: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rdisc[role='button'] {
    cursor: pointer;
  }
  .rdisc[role='button']:hover {
    border-color: color-mix(in oklab, var(--primary) 40%, transparent);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--primary) 6%, transparent);
  }
  .rdisc-img-wrap {
    width: 100%;
    aspect-ratio: 16/10;
    overflow: hidden;
  }
  .rdisc-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rdisc-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px 12px;
  }
  .rdisc-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }
  .rdisc-desc {
    font-size: 11px;
    line-height: 1.4;
    color: var(--muted-foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }
  .rdisc-source {
    font-size: 10px;
    color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    margin-top: 2px;
  }
</style>
