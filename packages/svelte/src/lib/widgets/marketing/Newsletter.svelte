<!--
  @file widgets/marketing/Newsletter.svelte
  @description Email-capture band. Renders a <form>; on submit it preventDefaults
    and calls the onsubmit prop with the entered email. NodeRenderer wires
    onsubmit from node.on_submit (e.g. an emit / call_binding handler).
  @created 2026-05-30 — RFC 12 marketing widget pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    heading?: string; subtext?: string; placeholder?: string; button?: string;
    onsubmit?: (value: unknown) => void;
  }
  let { id, class: className, style, heading, subtext, placeholder = 'you@example.com', button = 'Subscribe', onsubmit }: Props = $props();
  let email = $state('');
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onsubmit?.(email);
  }
</script>

<section {id} class={cn('w-full flex flex-col gap-4 items-center text-center rounded-xl border border-border bg-card text-card-foreground p-8', className)} style={styleString}>
  {#if heading}<h3 class="text-xl font-semibold tracking-tight">{heading}</h3>{/if}
  {#if subtext}<p class="text-sm text-muted-foreground max-w-md">{subtext}</p>{/if}
  <form class="flex w-full max-w-md gap-2" onsubmit={handleSubmit}>
    <input type="email" required bind:value={email} {placeholder} class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
    <button type="submit" class="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">{button}</button>
  </form>
</section>
