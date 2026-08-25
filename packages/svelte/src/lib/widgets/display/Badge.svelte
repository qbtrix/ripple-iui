<!-- 2026-06-27: forward node id — bind id + data-ripple-node on root (passed through the
     shadcn Badge restProps) so the visual editor can select this widget directly (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { asText } from '$lib/widgets/text-coerce';

  interface Props {
    id?: string;
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    class?: string;
  }

  let { id, text = '', variant = 'default', class: className }: Props = $props();

  // Map Ripple-specific variants to shadcn badge variants, with custom classes for success/warning
  const variantMap: Record<string, string> = {
    success: 'bg-ripple-success/10 text-ripple-success border-ripple-success/20',
    warning: 'bg-ripple-warning/10 text-ripple-warning border-ripple-warning/20',
  };

  const shadcnVariant = $derived(
    ['default', 'secondary', 'destructive', 'outline'].includes(variant)
      ? variant as 'default' | 'secondary' | 'destructive' | 'outline'
      : 'outline'
  );

  const extraClass = $derived(variantMap[variant] ?? '');

  // Bindings deliver numbers/booleans as readily as strings ({state.x.score}).
  // Coerce before the emptiness check — .trim() exists only on strings, and a
  // non-string prop must render, not crash the canvas.
  const label = $derived(asText(text));
</script>

<!-- Empty guard: an empty badge (no text) would render as a bare bordered pill —
     a stray-circle artifact in cards. Render nothing when there's no content. -->
{#if label.trim()}
  <Badge {id} data-ripple-node={id} variant={shadcnVariant} class={cn(extraClass, className)}>
    {label}
  </Badge>
{/if}
