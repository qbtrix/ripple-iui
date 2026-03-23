<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Progress } from '$lib/components/ui/progress/index.js';

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

  let {
    value = 0, max = 100, color, variant = 'default',
    class: className, style
  }: Props = $props();

  const variantClass = $derived({
    'default': '',
    'thin': 'h-0.5',
    'thick': 'h-2',
  }[variant]);

  const styleString = $derived.by(() => {
    const s: string[] = [];
    if (color) s.push(`--progress-color:${color}`);
    if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    return s.length > 0 ? s.join(';') : undefined;
  });
</script>

<Progress
  {value}
  {max}
  class={cn(variantClass, color ? '[&_[data-slot=progress-indicator]]:bg-[var(--progress-color)]' : '', className)}
  style={styleString}
/>
