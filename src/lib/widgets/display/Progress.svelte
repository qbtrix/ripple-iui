<script lang="ts">
  interface Props {
    value?: number;
    max?: number;
    /** Bar color override */
    color?: string;
    /** Height variant */
    variant?: 'default' | 'thin' | 'thick';
    class?: string;
    style?: Record<string, string>;
  }

  let { value = 0, max = 100, color, variant = 'default', class: className, style }: Props = $props();
  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));

  const styleString = $derived.by(() => {
    const s: string[] = [];
    if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    return s.length > 0 ? s.join(';') : undefined;
  });
</script>

<div class="rp rp--{variant} {className ?? ''}" role="progressbar" aria-valuenow={value} aria-valuemax={max} style={styleString}>
  <div class="rp-bar" style="width:{percentage}%;{color ? `background:${color}` : ''}"></div>
</div>

<style>
  .rp {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--ripple-surface-hover, rgba(255,255,255,0.06));
    overflow: hidden;
    flex: 1;
    min-width: 0;
  }
  .rp--thin { height: 4px; border-radius: 2px; }
  .rp--thick { height: 8px; border-radius: 4px; }
  .rp-bar {
    height: 100%;
    border-radius: inherit;
    background: var(--ripple-text-muted, rgba(255,255,255,0.38));
    transition: width 0.3s ease;
    opacity: 0.75;
  }
  .rp:hover .rp-bar { opacity: 1; }
</style>
