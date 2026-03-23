<script lang="ts">
  interface Props {
    id?: string;
    class?: string;
    text?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }

  let { id, class: className, text = '', level = 2 }: Props = $props();
</script>

{#if level === 1}
  <h1 {id} class="rh rh-1 {className ?? ''}">{text}</h1>
{:else if level === 2}
  <h2 {id} class="rh rh-2 {className ?? ''}">{text}</h2>
{:else if level === 3}
  <h3 {id} class="rh rh-3 {className ?? ''}">{text}</h3>
{:else if level === 4}
  <h4 {id} class="rh rh-4 {className ?? ''}">{text}</h4>
{:else if level === 5}
  <h5 {id} class="rh rh-5 {className ?? ''}">{text}</h5>
{:else}
  <h6 {id} class="rh rh-6 {className ?? ''}">{text}</h6>
{/if}

<style>
  .rh { margin: 0; color: var(--ripple-text); }
  .rh-1 { font-size: 28px; font-weight: 700; }
  .rh-2 { font-size: 22px; font-weight: 700; }
  .rh-3 { font-size: 18px; font-weight: 600; }
  .rh-4 { font-size: 15px; font-weight: 600; }
  .rh-5 { font-size: 13px; font-weight: 600; }
  .rh-6 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ripple-text-muted); }
</style>
