<!-- src/lib/widgets/display/LinkPreview.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import LinkIcon from '@lucide/svelte/icons/link';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    url: string;
    title?: string;
    description?: string;
    image?: string;
    /** Override the auto-derived domain label. */
    domain?: string;
    /** Optional favicon URL. */
    favicon?: string;
    /** Layout — 'horizontal' (image left, content right) or 'vertical' (image top). */
    layout?: 'horizontal' | 'vertical';
    /** Open link in new tab (default true). */
    newTab?: boolean;
  }

  let {
    id,
    class: className,
    style,
    url,
    title,
    description,
    image,
    domain,
    favicon,
    layout = 'horizontal',
    newTab = true
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const derivedDomain = $derived.by(() => {
    if (domain) return domain;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  });

  const target = $derived(newTab ? '_blank' : undefined);
  const rel = $derived(newTab ? 'noopener noreferrer' : undefined);
</script>

<a
  {id}
  href={url}
  {target}
  {rel}
  class={cn(
    'group block max-w-md rounded-ripple border border-ripple-border overflow-hidden transition-colors hover:border-ripple-accent/40 hover:bg-ripple-muted/30',
    className
  )}
  style={styleString}
>
  <div class={cn('flex', layout === 'horizontal' ? 'flex-row' : 'flex-col')}>
    {#if image}
      <div
        class={cn(
          'shrink-0 bg-muted',
          layout === 'horizontal' ? 'w-32 h-full min-h-[88px]' : 'w-full h-40'
        )}
      >
        <img src={image} alt="" class="w-full h-full object-cover" loading="lazy" />
      </div>
    {/if}
    <div class="flex-1 min-w-0 p-3">
      <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {#if favicon}
          <img src={favicon} alt="" class="h-3.5 w-3.5 rounded-sm" loading="lazy" />
        {:else}
          <LinkIcon size={11} />
        {/if}
        <span class="truncate">{derivedDomain}</span>
        <ExternalLinkIcon size={11} class="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>
      {#if title}
        <div class="mt-1 text-sm font-medium leading-snug line-clamp-2">{title}</div>
      {/if}
      {#if description}
        <p class="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
      {/if}
    </div>
  </div>
</a>
