<!--
  @file widgets/ai/ContextCards.svelte
  @description NEW (beautiful-ui re-skin arc, skin-context lane, 2026-09-17). The
    retrieved context an agent is working from: a header naming the set and its
    size ("All chunks 32"), then one card per chunk with a title, its character
    count, the excerpt, and a chip naming the file it came from.

    WHY IT IS NEW. The research family was checked first. SourceCard is a narrow
    carousel card for a web source with no excerpt or count. Citation is an
    inline favicon chip that fakes a link with `window.open`. SourcesBar is a
    favicon stack with share/copy. Holding a chunk in any of them would change a
    registered widget's shape. The reasoning is in the skin-context status file.

    COMPOSES. The file chip is `SourceChip` at `md`, the same component
    AnswerBlock renders inline. The count badge is `Chip` at `sm`.

    FROM THE SOURCE, CHANGED. `labels.count` was a hard-coded "32". Here it is
    `count`, which defaults to `chunks.length` (SourcesBar's convention).
    `chars` was a preformatted string and is now a number, formatted here.
    `tone: "bg-red"` leaked a Tailwind class name into data; it is `color`, a CSS
    colour, as SourceCard takes it. `badge` defaults to the file extension.
    The 700ms `setTimeout` that revealed the chips is now a CSS animation-delay
    (`--ripple-source-chip-delay`), so there is no timer state to clean up. The
    unused `variant` prop is dropped.

    NOT REGISTERED, same placement as TaskRows / PromptBar / AnswerBlock: under
    `widgets/ai/`, exported from `src/lib/ui/index.ts` only, so the manifest
    still reports 189 widgets.
  @a11y The chunks are a list labelled by the header. A source with `href` is a
    real link whose name is the file name. Entry animations stop under
    prefers-reduced-motion.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/ContextCards.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Chip from '$lib/widgets/display/Chip.svelte';
  import SourceChip from './SourceChip.svelte';

  interface ContextChunk {
    title: string;
    /** The retrieved excerpt. */
    body: string;
    /** File or document the chunk came from, shown in the chip. */
    source: string;
    /** Character count of the chunk. Absent hides the count. */
    chars?: number;
    /** Link to the source. Absent renders the chip as plain text. */
    href?: string;
    /** Short type glyph in the chip. Defaults to the file extension, e.g. "PDF". */
    badge?: string;
    /** CSS colour behind the badge. */
    color?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    chunks?: ContextChunk[];
    /** The size of the whole set, which can exceed what is shown. Defaults to `chunks.length`. */
    count?: number;
    labels?: { header?: string };
  }

  let { id, class: className, style, chunks = [], count, labels }: Props = $props();

  const header = $derived(labels?.header ?? 'All chunks');
  const total = $derived(count ?? chunks.length);

  const charsLabel = (n: number) => `${n.toLocaleString('en-US')} character${n === 1 ? '' : 's'}`;
  /** "Dairy Onboarding SOP.pdf" → "PDF". No dot, no badge text. */
  const extension = (name: string) => (name.includes('.') ? name.split('.').pop()!.toUpperCase() : undefined);

  const uid = $props.id();
  const headerId = $derived(`${id ?? uid}-header`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  class={cn('ripple-context-cards flex w-full max-w-95 flex-col gap-2', className)}
  style={styleString}
>
  <div id={headerId} class="ripple-context-fade-in flex items-center gap-2 px-0.5">
    <span class="text-[13px] font-semibold text-ripple-surface-foreground">{header}</span>
    <Chip
      size="sm"
      label={String(total)}
      class="h-5 text-[11.5px] tabular-nums text-[color-mix(in_oklab,var(--ripple-muted-foreground)_80%,var(--ripple-surface-foreground))]"
    />
  </div>

  <ul aria-labelledby={headerId} class="m-0 flex list-none flex-col gap-2 p-0">
    {#each chunks as chunk, i (i)}
      <li
        class="ripple-context-card overflow-hidden rounded-ripple bg-ripple-surface ring-1 ring-ripple-border"
        style:--i={i}
      >
        <div class="flex items-center gap-2.5 border-b border-ripple-border px-3 py-2.5">
          <span class="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ripple-surface-foreground">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              aria-hidden="true"
              class="shrink-0"
            >
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            <span class="truncate">{chunk.title}</span>
          </span>
          {#if chunk.chars !== undefined}
            <span class="ml-auto shrink-0 text-[12px] text-ripple-muted-foreground tabular-nums">
              {charsLabel(chunk.chars)}
            </span>
          {/if}
        </div>
        <p class="px-3 pt-2 pb-1 text-[12.5px] leading-relaxed text-ripple-muted-foreground">
          {chunk.body}
        </p>
        <div class="px-3 pb-3">
          <SourceChip
            size="md"
            label={chunk.source}
            href={chunk.href}
            mark={chunk.badge ?? extension(chunk.source)}
            color={chunk.color}
          />
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .ripple-context-fade-in {
    animation: ripple-context-fade-in 400ms ease-out both;
  }
  .ripple-context-card {
    animation: ripple-context-fade-up 400ms var(--ripple-ease-out) both;
    animation-delay: calc(var(--i, 0) * 100ms);
    /* The chips land once the cards have: 700ms, then 80ms apart. */
    --ripple-source-chip-delay: calc(700ms + var(--i, 0) * 80ms);
  }
  @keyframes ripple-context-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes ripple-context-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-context-fade-in,
    .ripple-context-card {
      animation: none;
    }
  }
</style>
