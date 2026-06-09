<!--
  @file widgets/marketing/Faq.svelte
  @description SSR/static-safe FAQ section for the marketing pack. Renders
    {question, answer} pairs as NATIVE <details>/<summary> disclosures — no
    bits-ui Accordion, no client JS. Expand/collapse is the browser's built-in
    <details> behaviour, so it works fully with JavaScript OFF (the resting,
    prerendered state is the collapsed list; toggling needs zero hydration).
    The chevron rotation is pure CSS driven by the [open] attribute, so it also
    degrades gracefully. Styled to match the marketing pack (cn() + Tailwind
    tokens: border, card, muted-foreground).
  @created 2026-06-09 — ITEM 3: marketing FAQ widget (type `faq`).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface FaqItem { question: string; answer: string; }
  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Optional section heading rendered above the list. */
    title?: string;
    /** The question/answer pairs. */
    items?: FaqItem[];
  }
  let { id, class: className, style, title, items = [] }: Props = $props();
  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<section {id} class={cn('w-full flex flex-col gap-6', className)} style={styleString}>
  {#if title}
    <h2 class="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
  {/if}
  <div class="flex flex-col divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
    {#each items as item}
      <details class="ripple-faq group">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium [&::-webkit-details-marker]:hidden"
        >
          <span>{item.question}</span>
          <svg
            class="ripple-faq-chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <p class="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
      </details>
    {/each}
  </div>
</section>

<style>
  /* Pure-CSS chevron flip on the native open state — no JS, static-safe. */
  .ripple-faq[open] .ripple-faq-chevron {
    transform: rotate(180deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-faq-chevron {
      transition: none;
    }
  }
</style>
