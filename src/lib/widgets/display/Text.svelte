<script lang="ts">
  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    text?: string;
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?: string;
    inline?: boolean;
  }

  let {
    id, class: className, style, text = '', size = 'base',
    weight = 'normal', color, inline = false
  }: Props = $props();

  const styleString = $derived.by(() => {
    const styles: string[] = [];
    if (color && (color.startsWith('#') || color.startsWith('rgb'))) {
      styles.push(`color:${color}`);
    }
    if (style) {
      styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    }
    return styles.length > 0 ? styles.join(';') : undefined;
  });
</script>

{#if inline}
  <span {id} class="rt rt-{size} rt-w-{weight} {className ?? ''}" style={styleString}>{text}</span>
{:else}
  <p {id} class="rt rt-{size} rt-w-{weight} {className ?? ''}" style={styleString}>{text}</p>
{/if}

<style>
  .rt { margin: 0; }

  /* Size scale */
  .rt-xs  { font-size: 10px; color: var(--ripple-text-muted); }
  .rt-sm  { font-size: 11px; color: var(--ripple-text-secondary); }
  .rt-base { font-size: 13px; color: var(--ripple-text); }
  .rt-lg  { font-size: 15px; color: var(--ripple-text); font-family: var(--ripple-font-mono); }
  .rt-xl  { font-size: 18px; color: var(--ripple-text); font-family: var(--ripple-font-mono); }
  .rt-2xl { font-size: 22px; color: var(--ripple-text); font-family: var(--ripple-font-mono); }
  .rt-3xl { font-size: 28px; color: var(--ripple-text); font-family: var(--ripple-font-mono); }

  /* Weight */
  .rt-w-normal { font-weight: 400; }
  .rt-w-medium { font-weight: 500; }
  .rt-w-semibold { font-weight: 600; }
  .rt-w-bold { font-weight: 700; }
</style>
