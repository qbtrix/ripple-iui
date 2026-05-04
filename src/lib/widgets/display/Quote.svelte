<script lang="ts">
  import { cn } from '$lib/utils.js';
  import QuoteIcon from '@lucide/svelte/icons/quote';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    text: string;
    /** Optional alias for `text`. */
    quote?: string;
    author?: string;
    role?: string;
    avatar?: string;
    /** Hide the leading quote glyph. */
    hideIcon?: boolean;
  }

  let {
    id, class: className, style,
    text, quote, author, role, avatar, hideIcon = false
  }: Props = $props();

  const body = $derived(text ?? quote ?? '');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<figure
  {id}
  class={cn('flex flex-col gap-4 p-5', className)}
  style={styleString}
>
  {#if !hideIcon}
    <QuoteIcon size={22} class="text-muted-foreground/60" />
  {/if}
  <blockquote class="text-base md:text-lg leading-relaxed">
    {body}
  </blockquote>
  {#if author || role}
    <figcaption class="flex items-center gap-3">
      {#if avatar}
        <img src={avatar} alt={author ?? ''} class="size-9 rounded-full object-cover" />
      {/if}
      <div class="flex flex-col">
        {#if author}<span class="text-sm font-semibold">{author}</span>{/if}
        {#if role}<span class="text-xs text-muted-foreground">{role}</span>{/if}
      </div>
    </figcaption>
  {/if}
</figure>
