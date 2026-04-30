<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    orientation?: 'horizontal' | 'vertical';
  }

  let { id, class: className, style, orientation = 'horizontal' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<Separator
  {id}
  {orientation}
  class={cn(className)}
  style={styleString}
/>
