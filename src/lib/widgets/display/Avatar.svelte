<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    src?: string;
    alt?: string;
    fallback?: string;
  }

  let {
    id, class: className, style, src, alt = '',
    fallback = '?'
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<Avatar.Root {id} class={cn(className)} style={styleString}>
  <Avatar.Image {src} {alt} />
  <Avatar.Fallback>{fallback}</Avatar.Fallback>
</Avatar.Root>
