<script lang="ts">
  import { cn } from '../../utils.js';
  import { Badge } from '../../components/ui/badge/index.js';

  interface Props {
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    class?: string;
  }

  let { text = '', variant = 'default', class: className }: Props = $props();

  // Map Ripple-specific variants to shadcn badge variants, with custom classes for success/warning
  const variantMap: Record<string, string> = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
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
