<script lang="ts">
  import { cn } from '../../utils.js';

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

  const sizeClasses: Record<string, string> = {
    xs: 'text-xs text-muted-foreground',
    sm: 'text-sm text-muted-foreground',
    base: 'text-sm text-foreground',
    lg: 'text-base text-foreground font-mono',
    xl: 'text-lg text-foreground font-mono',
    '2xl': 'text-xl text-foreground font-mono',
    '3xl': 'text-2xl text-foreground font-mono',
  };

  const weightClasses: Record<string, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

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
  <span {id} class={cn('m-0', sizeClasses[size], weightClasses[weight], className)} style={styleString}>{text}</span>
{:else}
  <p {id} class={cn('m-0', sizeClasses[size], weightClasses[weight], className)} style={styleString}>{text}</p>
{/if}
