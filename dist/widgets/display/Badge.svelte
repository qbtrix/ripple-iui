<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    class?: string;
  }

  let { text = '', variant = 'default', class: className }: Props = $props();
</script>

<span class={cn('ripple-badge', `ripple-badge--${variant}`, className)} data-variant={variant}>
  {text}
</span>
