<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    src?: string;
    alt?: string;
    fallback?: string;
    class?: string;
  }

  let { src, alt = '', fallback = '?', class: className }: Props = $props();
  let imgError = $state(false);
</script>

<div class={cn('ripple-avatar', className)}>
  {#if src && !imgError}
    <img {src} {alt} class="ripple-avatar-image" onerror={() => { imgError = true; }} />
  {:else}
    <span class="ripple-avatar-fallback">{fallback}</span>
  {/if}
</div>
