<!-- 2026-06-27: forward node id — the shadcn <Progress> wrapper forwards only value/max/class,
     so wrap it in a display:contents element (no layout box) that carries id + data-ripple-node
     for editor selection (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Progress } from '$lib/components/ui/progress/index.js';

  interface Props {
    id?: string;
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
    id, value = 0, max = 100, color, variant = 'default',
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

<!-- display:contents wrapper generates no layout box, so the bar lays out exactly
     as before; it exists only to carry the node id for editor selection. -->
<div {id} data-ripple-node={id} style="display: contents">
  <Progress
    {value}
    {max}
    class={cn(variantClass, color ? '[&_[data-slot=progress-indicator]]:bg-[var(--progress-color)]' : '', className)}
    style={styleString}
  />
</div>
