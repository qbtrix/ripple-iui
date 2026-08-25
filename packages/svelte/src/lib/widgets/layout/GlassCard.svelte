<!-- GlassCard.svelte — Glass morphism container widget for Ripple.
     Created: Phase 4 of paw-os-ui migration.
     Extracted liquid glass CSS from paw-enterprise OS layout into a reusable widget.
     Props: opacity, blur, tint, borderGlow for full glass customization.
     Updated 2026-06-09 (a11y): optional onclick uses a conditional-spread so the
     card is a plain element with no handler and a keyboard-operable role="button"
     (Enter/Space) when one is passed. Replaces the dead svelte-ignore. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    title?: string;
    description?: string;
    opacity?: number;    // Glass opacity 0-100, default 38
    blur?: number;       // Blur px, default 8
    tint?: string;       // Tint color, default '#000000'
    borderGlow?: boolean; // Enable reflex border glow, default true
    onclick?: (e?: unknown) => void;
  }

  let {
    id, class: className, style, children, title, description,
    opacity = 38, blur = 8, tint = '#000000', borderGlow = true, onclick
  }: Props = $props();

  const glassStyle = $derived.by(() => {
    const base: Record<string, string> = {
      'background-color': `color-mix(in srgb, ${tint} ${opacity}%, transparent)`,
      'backdrop-filter': `blur(${blur}px) saturate(150%)`,
      '-webkit-backdrop-filter': `blur(${blur}px) saturate(150%)`,
      'border': '1px solid rgba(255, 255, 255, 0.12)',
      'border-radius': '12px',
    };
    if (borderGlow) {
      base['box-shadow'] = [
        'inset 0 0 0 1px color-mix(in srgb, #fff 10%, transparent)',
        'inset 2px 1px 0px -1px color-mix(in srgb, #fff 30%, transparent)',
        'inset -1.5px -1px 0px -1px color-mix(in srgb, #fff 20%, transparent)',
        'inset -2px -6px 1px -5px color-mix(in srgb, #fff 40%, transparent)',
        'inset -1px 2px 3px -1px color-mix(in srgb, #000 20%, transparent)',
        '0px 3px 10px 0px color-mix(in srgb, #000 12%, transparent)',
      ].join(', ');
    }
    // Merge user style
    if (style) Object.assign(base, style);
    return Object.entries(base).map(([k, v]) => `${k}:${v}`).join(';');
  });

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.(e); }
  }
  const interactive = $derived(
    onclick ? { role: 'button', tabindex: 0, onclick, onkeydown: handleKey } : {}
  );
</script>

<div {id} class={cn('ripple-glass-card', className)} style={glassStyle} {...interactive}>
  {#if title || description}
    <div class="glass-card-header">
      {#if title}
        <h3 class="glass-card-title">{title}</h3>
      {/if}
      {#if description}
        <p class="glass-card-desc">{description}</p>
      {/if}
    </div>
  {/if}
  <div class="glass-card-content">
    {@render children?.()}
  </div>
</div>

<style>
  .ripple-glass-card {
    color: rgba(255, 255, 255, 0.92);
    overflow: hidden;
  }
  .glass-card-header {
    padding: 16px 16px 0;
  }
  .glass-card-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.90);
    margin: 0 0 4px;
  }
  .glass-card-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.50);
    margin: 0;
    line-height: 1.4;
  }
  .glass-card-content {
    padding: 16px;
  }
</style>
