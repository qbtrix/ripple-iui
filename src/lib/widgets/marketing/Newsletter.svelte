<!--
  @file widgets/marketing/Newsletter.svelte
  @description Email-capture band. Renders a <form>; on submit it preventDefaults
    and calls the onsubmit prop with the entered email. NodeRenderer wires
    onsubmit from node.on_submit (e.g. an emit / call_binding handler).
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Visual polish: stronger heading hierarchy, input
    focus ring, button hover lift, a privacy hint slot via optional `note`.
    Prop API additive (only `note` added); form submit logic unchanged.
    SSR-safe (no window/onMount).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    heading?: string; subtext?: string; placeholder?: string; button?: string;
    /** Optional fine-print note shown under the form (e.g. a privacy line). */
    note?: string;
    onsubmit?: (value: unknown) => void;
  }
  let { id, class: className, style, heading, subtext, placeholder = 'you@example.com', button = 'Subscribe', note, onsubmit }: Props = $props();
  let email = $state('');
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onsubmit?.(email);
  }
</script>

<section {id} class={cn('w-full flex flex-col gap-4 items-center text-center rounded-2xl border border-border bg-card text-card-foreground p-10', className)} style={styleString}>
  {#if heading}<h3 class="text-2xl font-semibold tracking-tight">{heading}</h3>{/if}
  {#if subtext}<p class="text-sm text-muted-foreground max-w-md leading-relaxed">{subtext}</p>{/if}
  <form class="mt-1 flex w-full max-w-md flex-col gap-2 sm:flex-row" onsubmit={handleSubmit}>
    <input type="email" required bind:value={email} {placeholder} class="flex-1 rounded-md border border-input bg-background px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40" />
    <button type="submit" class="rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">{button}</button>
  </form>
  {#if note}<p class="text-xs text-muted-foreground/80">{note}</p>{/if}
</section>
