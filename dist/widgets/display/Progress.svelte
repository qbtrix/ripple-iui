<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    value?: number;
    max?: number;
    class?: string;
  }

  let { value = 0, max = 100, class: className }: Props = $props();
  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class={cn('ripple-progress', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
  <div class="ripple-progress-bar" style="width: {percentage}%"></div>
</div>
