<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/ui/badge/index.js';

  interface Props {
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    class?: string;
  }

  let { text = '', variant = 'default', class: className }: Props = $props();

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
</script>

<Badge variant={shadcnVariant} class={cn(extraClass, className)}>
  {text}
</Badge>
