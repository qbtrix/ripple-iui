<!--
  @file widgets/ai/SourceChip.svelte
  @description NEW (beautiful-ui re-skin arc, skin-context lane, 2026-09-17). The
    one source chip: a small tinted link naming where a piece of evidence came
    from. It started as markup inside AnswerBlock (#129). ContextCards needed the
    same chip, so it moved here, and both now render this file rather than
    keeping two copies.

    TWO SIZES, ONE CHIP. `sm` sits inline in running prose (AnswerBlock's cited
    domain), in mono at 10.5px with the source's -1px optical lift. `md` stands
    alone as a pill under a retrieved chunk (ContextCards' file name) with a
    type badge. The sources draw them differently, but they are the same thing:
    a mark, a label, and a link out.

    THE MARK. `image` when there is one. Otherwise a short glyph: `mark`
    (e.g. "PDF") or the label's first letter, on `color` when given. It is
    decorative (`aria-hidden`), because the label beside it already says
    everything the mark says.

    CONTRAST. The label is muted-foreground mixed 80% toward surface-foreground
    rather than plain muted-foreground. On ripple's own shadcn light defaults the
    plain pair is 4.35:1 on the muted ground, which fails AA. The mix gives 6.17
    there and 10.07 / 7.61+ on the paw-enterprise Gallery (light / dark). On
    hover the label goes to surface-foreground, as the source's `hover:text-ink`
    does. AnswerBlock had translated that to the accent, which measures
    2.96:1 on the Gallery's light ground (4.0 dark) against the hover tint.

    NOT REGISTERED and not exported from `./ui`. It is a part used by two
    organisms, not a spec widget.
  @a11y With `href` it is a real `<a>` that opens a new tab, and it says so to
    assistive tech. Its accessible name is the label. Without `href` it is a
    plain span. The pop-in stops under prefers-reduced-motion.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/StreamingText.tsx
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/ContextCards.tsx
-->
<script lang="ts">
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';

  interface Props {
    /** What the chip says — a domain, a file name. Also the link's accessible name. */
    label: string;
    /** Absent renders a plain span rather than a link. */
    href?: string;
    /** Square avatar image for the mark. */
    image?: string;
    /** Short glyph for the mark when there is no image, e.g. "PDF". Defaults to the label's first letter. */
    mark?: string;
    /** CSS colour behind the mark glyph. Absent keeps the muted ground. */
    color?: string;
    /** `sm` inline in prose, `md` a standalone pill. */
    size?: 'sm' | 'md';
    class?: string;
  }

  let { label, href, image, mark, color, size = 'sm', class: className }: Props = $props();

  const chip = tv({
    base: [
      'ripple-source-chip inline-flex shrink-0 items-center bg-ripple-muted',
      'text-[color-mix(in_oklab,var(--ripple-muted-foreground)_80%,var(--ripple-surface-foreground))]',
      'transition-colors duration-150 ease-ripple-out hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground',
    ],
    variants: {
      size: {
        sm: 'h-[18px] -translate-y-px gap-1 rounded-md px-[3px] align-middle font-mono text-[10.5px]',
        md: 'h-6 gap-1.5 rounded-full px-2 text-[12px] font-medium',
      },
    },
  });

  const markClass = tv({
    base: 'flex shrink-0 items-center justify-center object-cover uppercase leading-none',
    variants: {
      size: {
        sm: 'size-3 rounded-[3px] text-[8px] font-medium',
        md: 'size-3.5 rounded-[4px] text-[7px] font-bold',
      },
      filled: {
        true: 'text-white',
        false: 'bg-ripple-muted text-ripple-muted-foreground',
      },
    },
  });

  const glyph = $derived(mark ?? label.slice(0, 1));
</script>

<svelte:element
  this={href ? 'a' : 'span'}
  {href}
  target={href ? '_blank' : undefined}
  rel={href ? 'noreferrer' : undefined}
  class={cn(chip({ size }), className)}
>
  {#if image}
    <img src={image} alt="" class={markClass({ size, filled: false })} />
  {:else}
    <span
      aria-hidden="true"
      class={markClass({ size, filled: !!color })}
      style:background-color={color}
    >
      {glyph}
    </span>
  {/if}
  <span>{label}</span>
  {#if href}
    {#if size === 'md'}
      <ArrowUpRightIcon size={9} strokeWidth={2.5} aria-hidden="true" />
    {/if}
    <span class="sr-only">(opens in a new tab)</span>
  {/if}
</svelte:element>

<style>
  .ripple-source-chip {
    animation: ripple-source-chip-pop-in 250ms var(--ripple-ease-out) both;
    /* A list sets this on an ancestor to stagger its chips. */
    animation-delay: var(--ripple-source-chip-delay, 0ms);
  }
  @keyframes ripple-source-chip-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-source-chip {
      animation: none;
    }
  }
</style>
