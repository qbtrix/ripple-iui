<script lang="ts">
  interface Props {
    src?: string;
    alt?: string;
    fallback?: string;
    class?: string;
  }

  let { src, alt = '', fallback = '?', class: className }: Props = $props();
  let imgError = $state(false);
</script>

<div class="ra {className ?? ''}">
  {#if src && !imgError}
    <img {src} {alt} class="ra-img" onerror={() => { imgError = true; }} />
  {:else}
    <span class="ra-fb">{fallback}</span>
  {/if}
</div>

<style>
  .ra {
    width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
    background: var(--ripple-surface-hover);
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ra-img { width: 100%; height: 100%; object-fit: cover; }
  .ra-fb { font-size: 10px; font-weight: 500; color: var(--ripple-text-muted); }
</style>
